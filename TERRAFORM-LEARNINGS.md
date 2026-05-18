# Terraform on AWS — Learnings from Natours

A record of the problems I hit while wiring Terraform into the Natours CI/CD pipeline, why they happened, and how each was fixed. Future me / future projects: read this before setting up Terraform again.

---

## Problem 1 — Duplicate EC2 instances and `VpcLimitExceeded`

### What I saw

Every push to `master` caused Terraform to create a fresh VPC + EC2 instance. After a few pushes, I had 4 orphan `prod-vpc`s in `ap-south-1`, and the next apply failed with:

```
Error: api error VpcLimitExceeded: The maximum number of VPCs has been reached.
```

(AWS default quota is **5 VPCs per region**.)

### Root cause

The Terraform state file (`terraform.tfstate`) was being committed back to the Git repo from inside the GitHub Actions runner. The flow was:

1. Workflow runs → `terraform apply` → state updated **on the runner**.
2. Workflow then `git add terraform.tfstate && git commit && git push`.
3. **If anything between steps 1 and 2 fails**, state never reaches Git.
4. Next run checks out the *old* (empty) state from Git → Terraform sees no resources → creates everything fresh → orphan.

State-in-Git is fragile because state is mutable and updated frequently. Git is meant for code, not for shared mutable state.

### Fix — Remote state in S3 + native locking

```hcl
# terraform/main.tf
terraform {
  backend "s3" {
    bucket       = "nitinkdevs-tf-state"
    key          = "natours/terraform.tfstate"
    region       = "ap-south-1"
    use_lockfile = true       # S3 native locking (Terraform 1.10+)
    encrypt      = true
  }
}
```

Benefits:
- State is stored centrally and updated atomically.
- `use_lockfile = true` prevents two CI runs from clobbering state at the same time (replaces the older `dynamodb_table` parameter).
- `encrypt = true` enables SSE-S3 on the state object.

### Bootstrap problem

The S3 bucket and (formerly) DynamoDB table that *hold* the state can't be created by the same Terraform that uses them — chicken-and-egg. Solution: a one-time bootstrap script run **before** the first `terraform init`.

See [scripts/bootstrap-tf-backend.sh](scripts/bootstrap-tf-backend.sh). It uses AWS CLI to:
- Create the S3 bucket (idempotent — re-runnable).
- Enable versioning (so a corrupt state can be rolled back).
- Enable default encryption.
- Block all public access.

Run once locally:

```cmd
bash scripts/bootstrap-tf-backend.sh
```

After that, `terraform init` in CI just reads/writes state from S3.

### `.gitignore` update

Once state lives in S3, never commit it locally either:

```
terraform/*.tfstate
terraform/*.tfstate.backup
```

---

## Problem 2 — Terraform ran on every code push

### What I saw

Every push to `master` re-ran `terraform plan/apply`, even when only application code (a Pug template, a JS file) had changed. Slow, risky, and the cause of Problem 1.

### Fix — Split workflows + path-based trigger

Two workflow files instead of one monolithic one:

| File | Trigger | Purpose |
|------|---------|---------|
| `.github/workflows/docker-build-push.yml` | Push to `master` | Build Docker image, push to Docker Hub, SSH-deploy to EC2 |
| `.github/workflows/terraform-apply.yml` | Push that touches `terraform/**` **OR** manual dispatch | Provision/update AWS infra |
| `.github/workflows/terraform-destroy.yml` | Manual dispatch only, with typed "destroy" confirmation | Tear down AWS infra |

Key snippet — path-based trigger:

```yaml
on:
  push:
    branches: [master]
    paths:
      - 'terraform/**'
      - '.github/workflows/terraform-apply.yml'
  workflow_dispatch:
```

The deploy workflow no longer depends on the Terraform job. It reads EC2 connection info from repo secrets:

```yaml
env:
  HOST: ${{ secrets.EC2_HOST }}
  INSTANCE_ID: ${{ secrets.EC2_INSTANCE_ID }}
  INSTANCE_AZ: ${{ secrets.EC2_INSTANCE_AZ }}
```

After each terraform apply, copy the printed EC2 IP into the `EC2_HOST` secret. Manual but rare — only when infra changes.

---

## Problem 3 — Destroy workflow

### Why

For learning projects, the ability to **delete every AWS resource Terraform created with one click** is essential — otherwise you forget about a running EC2 and rack up a $20 bill at the end of the month.

### Design

- `workflow_dispatch` only — never auto-triggered.
- Requires a typed confirmation input (`"destroy"`) — `if:` guard rejects anything else.

```yaml
on:
  workflow_dispatch:
    inputs:
      confirm:
        description: 'Type "destroy" to confirm'
        required: true

jobs:
  destroy:
    if: ${{ github.event.inputs.confirm == 'destroy' }}
    steps:
      ...
      - name: Terraform Destroy
        run: terraform destroy -auto-approve
```

What it removes: VPC, subnet, IGW, security group, EC2 instance, Route 53 A records — everything in `main.tf`.

What it preserves (intentional):
- S3 bucket holding state (bootstrap infra).
- The `nitinkdevs.com` hosted zone (Route 53 — outside Terraform's scope; only the records inside it are managed).

---

## Problem 4 — Terraform Destroy did nothing (state was empty)

### What I saw

Ran `terraform destroy`, it reported "No objects need to be destroyed", but I could clearly see VPCs and EC2 instances in the AWS console.

### Root cause

The `terraform apply` had failed on the *first* resource (VPC limit error), so **nothing was ever written to state**. The state file only had `data` blocks (read-only lookups like `aws_ami.ubuntu`). Terraform can only destroy what it tracks.

### Fix

You can't `terraform destroy` resources Terraform doesn't know about. Two options:

1. **Manual cleanup via AWS Console** — straightforward for small numbers of resources.
2. **Manual cleanup via AWS CLI script** — see [scripts/delete-vpc.ps1](scripts/delete-vpc.ps1).

### VPC delete order (matters)

AWS won't let you delete a VPC while it has dependent resources. Correct order:

1. **EC2 instances** → terminate, wait for `terminated` state.
2. **Network interfaces (ENIs)** → delete any with status `available`.
3. **Internet Gateway** → detach from VPC, then delete.
4. **Subnets** → delete.
5. **Route tables** (non-main) → delete.
6. **Security groups** (non-default) → delete.
7. **VPC** → delete.

NACLs and default route tables/security groups disappear automatically with the VPC.

Run the script:

```cmd
powershell -ExecutionPolicy Bypass -File scripts/delete-vpc.ps1 vpc-aaa vpc-bbb ...
```

---

## Problem 5 — Shell credential mismatches on Windows

### What I saw

```
aws sts get-caller-identity   (in cmd)   →  works
aws sts get-caller-identity   (in bash)  →  AuthFailure
```

### Root cause

Three places AWS CLI can pull credentials, in priority order:

1. **Env vars** — `AWS_ACCESS_KEY_ID`, `AWS_SECRET_ACCESS_KEY`.
2. **Shared credentials file** — `~/.aws/credentials` (Linux/macOS) or `%USERPROFILE%\.aws\credentials` (Windows).
3. **IAM instance/role** — only on EC2.

Git Bash on Windows can pick up env vars set in `.bashrc`/`.bash_profile`, or have a different `$HOME` than cmd's `%USERPROFILE%`, causing it to read a different credentials file.

### Fixes

- **Cleanest:** use PowerShell or cmd for AWS CLI work on Windows. They reliably use `%USERPROFILE%\.aws\credentials`.
- **In bash, clear stale env vars first:**
  ```bash
  unset AWS_ACCESS_KEY_ID AWS_SECRET_ACCESS_KEY AWS_SESSION_TOKEN
  ```
- **Check what's actually being used:**
  ```bash
  aws configure list   # shows source of each value
  ```

### Common AWS CLI errors

| Error | What it means |
|-------|---------------|
| `InvalidAccessKeyId` | Access key ID doesn't exist in AWS (deleted/rotated) |
| `SignatureDoesNotMatch` | Access key ID is valid, but the secret doesn't match it |
| `AuthFailure` | Generic — usually credentials missing or invalid |
| `InvalidClientTokenId` | Token (often a session token) is bad/expired |

---

## Recovery checklist (when CI is wedged)

If Terraform CI is failing and you suspect state/orphan drift:

1. `terraform state list` (locally, with backend configured) — shows what Terraform thinks exists.
2. Compare against reality: `aws ec2 describe-vpcs --region <r> --output table`, `aws ec2 describe-instances --region <r> --output table`.
3. If state is empty but AWS has resources → manual cleanup (Console or `delete-vpc.ps1`).
4. If state has resources but AWS doesn't → `terraform state rm <resource>` for each stale entry, then re-apply.
5. If quotas are blocking → request a limit increase from AWS support **or** clean up orphans (faster for learning projects).

---

## Repeatable subdomain pattern for future projects

The Natours app lives at `natours.nitinkdevs.com`. For the next project (e.g., `ecommerce.nitinkdevs.com`):

1. Copy `terraform/`, change `variable "domain"` default to `ecommerce.nitinkdevs.com`.
2. Keep `variable "root_domain"` as `nitinkdevs.com` — same hosted zone, no new DNS purchase.
3. Use a different S3 state key: `backend "s3" { key = "ecommerce/terraform.tfstate" }`. Same bucket is fine.
4. Each project gets its own destroy workflow, isolated state, isolated infra.

**Subdomains are free.** `natours.nitinkdevs.com` shares the parent's registration. `natours-nitinkdevs.com` (with a hyphen) would be a separate root domain costing ~$12/yr — a common naming mistake.

---

## Reference: file/secret layout after these changes

```
.github/workflows/
  docker-build-push.yml      # build + deploy on every push
  terraform-apply.yml        # infra on terraform/** changes or manual
  terraform-destroy.yml      # manual only, typed confirmation

terraform/
  main.tf                    # backend "s3" block + AWS resources
  variables.tf               # domain, root_domain, region, etc.
  outputs.tf
  entry-script.sh

scripts/
  bootstrap-tf-backend.sh    # one-time S3 bucket creation
  delete-vpc.ps1             # emergency manual cleanup
  setup-ec2.sh               # one-time EC2 server setup
```

Required GitHub repo secrets:

| Secret | Used by | Purpose |
|--------|---------|---------|
| `AWS_ACCESS_KEY_ID` | apply, destroy, deploy | AWS auth |
| `AWS_SECRET_ACCESS_KEY` | apply, destroy, deploy | AWS auth |
| `EC2_SSH_KEY` | apply, destroy, deploy | SSH private key (for terraform var + deploy) |
| `EC2_HOST` | deploy | EC2 public IP (update after each apply) |
| `EC2_INSTANCE_ID` | deploy | Optional, for EC2 Instance Connect fallback |
| `EC2_INSTANCE_AZ` | deploy | Optional, for EC2 Instance Connect fallback |
| `EC2_USER` | deploy | Usually `ubuntu` |
| `DOCKERHUB_USERNAME` | build | Image push |
| `DOCKER_PASSWORD` | build | Image push |
| `MY_IP` | apply, destroy | Source CIDR for SSH security group rule |
| `PROD_ENV_B64` | deploy | base64-encoded production `.env` |
