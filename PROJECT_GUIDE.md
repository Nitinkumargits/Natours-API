# Natours — Full Project Guide (Development + Deployment)

End-to-end reference for the Natours tour-booking application: what every piece of code does, how the build pipeline turns source into a running container, and how a `git push` reaches production on a public HTTPS domain. Written for someone who needs to operate, debug, or interview about this codebase.

---

## 1. Bird's-eye view

```
Browser
   │   HTTPS (443)
   ▼
natours.nitinkdevs.com  ──►  Route 53 A record ──►  EC2 public IP
                                                      │
                                                      ▼
                                              ┌──────────────────┐
                                              │  EC2 (Ubuntu 22) │
                                              │  ┌────────────┐  │
                                              │  │   Nginx    │  │ ports 80/443
                                              │  │  + Certbot │  │ TLS termination
                                              │  └─────┬──────┘  │
                                              │        │ proxy   │
                                              │        ▼         │
                                              │  ┌────────────┐  │
                                              │  │  Docker    │  │ port 127.0.0.1:3000
                                              │  │  app       │  │ Node 20 + Express
                                              │  └─────┬──────┘  │
                                              └────────┼─────────┘
                                                       │
                            ┌──────────────────────────┼──────────────────────────┐
                            ▼                          ▼                          ▼
                     MongoDB Atlas             Stripe Checkout              Gmail SMTP
                     (data plane)              (payments + webhook)         (auth emails)
```

External SaaS used:
- **MongoDB Atlas** — tours, users, reviews, bookings.
- **Stripe (test mode)** — checkout sessions + webhook for confirming paid bookings.
- **Mapbox** — interactive tour location map.
- **Gmail SMTP (App Password)** — welcome, password-reset, and other transactional emails.
- **AWS S3** — Terraform remote state (`nitinkdevs-tf-state`).
- **Docker Hub** — container image registry (`nitinkdocker18/natoursapi`).
- **GitHub Actions** — CI/CD (build, push image, provision infra, deploy).
- **Let's Encrypt (via Certbot)** — TLS certificates.

---

## 2. Tech stack & file layout

### 2.1 Server stack
- **Node 20** runtime (alpine in Docker).
- **Express 4** HTTP framework.
- **Mongoose 5** ODM → MongoDB Atlas (TLS, replica set).
- **Pug** server-side templates.
- Security middleware: `helmet`, `express-rate-limit`, `express-mongo-sanitize`, `xss-clean`, `hpp`, `cookie-parser`, `cors`, `compression`.
- **Multer + sharp** image upload / resize.
- **nodemailer** Gmail transport.
- **stripe** SDK for Checkout + webhook signature verification.
- **dotenv** loads `prod.env` (note: this project reads `prod.env`, *not* `.env`).

### 2.2 Frontend stack
- Vanilla ES6 sources under [public/js/](public/js/) bundled by **Parcel 2** into [public/dist/index.js](public/dist/index.js).
- Pug views in [views/](views/), base layout at [views/base.pug](views/base.pug).
- Externally loaded scripts: `axios`, `mapbox-gl`, `stripe.js v3` (CDN/Stripe, see [views/base.pug:54](views/base.pug#L54) and [views/tour.pug:6-8](views/tour.pug#L6-L8)).

### 2.3 Repo layout
```
.
├── app.js                  # Express app: middleware chain + route mounts
├── server.js               # Process entry: dotenv → Mongo connect → app.listen
├── controllers/            # Business logic (one file per resource)
├── models/                 # Mongoose schemas (Tour, User, Review, Booking)
├── routes/                 # Express routers, mounted under /api/v1/...
├── views/                  # Pug templates (rendered by viewRouter)
├── public/                 # Static assets
│   ├── js/                 # Frontend ES6 source (Parcel input)
│   ├── dist/               # Parcel build output (loaded by base.pug)
│   ├── css/, img/, locales/
├── utils/                  # appError, catchAsync, email, apiFeatures
├── dev-data/               # JSON seed data + scripts/import-dev-data.js
├── Dockerfile              # 2-stage build (Parcel build + slim runtime)
├── nginx/                  # Reference nginx config (the live config is written
│                           #   inline by docker-build-push.yml on EC2)
├── terraform/              # IaC: VPC, subnet, IGW, SG, EC2, Route 53
├── .github/workflows/
│   ├── docker-build-push.yml  # Build image → push → deploy to EC2
│   ├── terraform-apply.yml    # Provision/refresh infra
│   └── terraform-destroy.yml  # Tear it all down (manual)
├── prod.env                # **Local** copy of env (incl. PROD_ENV_B64 line)
└── prod.env.b64            # Standalone copy of just the B64 string
```

### 2.4 Hot files to know
- [server.js](server.js) — entry; reads `./prod.env`; opens Mongo; starts listener; handles `SIGTERM` / `unhandledRejection`.
- [app.js](app.js) — Express middleware order is load-bearing. CSP is configured for Mapbox + Stripe; the Stripe webhook is mounted *before* `express.json()` so the raw body remains for signature verification.
- [controllers/bookingController.js](controllers/bookingController.js) — creates Stripe Checkout sessions and handles the `checkout.session.completed` webhook.
- [utils/email.js](utils/email.js) — nodemailer Gmail transport (always Gmail in this project — the SendGrid branch was removed).
- [public/js/index.js](public/js/index.js) — Parcel entry. Wires every DOM event to its handler.
- [Dockerfile](Dockerfile) — build context for the production image.
- [.github/workflows/docker-build-push.yml](.github/workflows/docker-build-push.yml) — the only deploy pipeline.
- [terraform/main.tf](terraform/main.tf) — every piece of AWS infra except the Route 53 *zone* (the zone is intentionally not managed by Terraform — only the records inside it).

---

## 3. Local development

### 3.1 Prereqs
- Node ≥ 16 (20 recommended), npm, git.
- A `prod.env` file at the repo root populated with the variables listed in §4. The file name is `prod.env` (not `.env`) because [server.js:12](server.js#L12) hardcodes that path.

### 3.2 First-time setup
```bash
npm install
node dev-data/data/import-dev-data.js --import   # seeds MongoDB (read the script before running)
```

### 3.3 Day-to-day commands (`package.json` scripts)
| Script | Command | Purpose |
| --- | --- | --- |
| `start` | `node server.js` | Plain run |
| `dev` | `nodemon server.js` | Auto-restart on server changes |
| `start:prod` | `NODE_ENV=production nodemon server.js` | Simulate prod locally (Linux/Mac syntax — on Windows set the env var first) |
| `watch:js` | `parcel watch ./public/js/index.js --dist-dir ./public/dist --no-cache` | Live-rebuild the frontend bundle |
| `build:js` | `parcel build ./public/js/index.js --dist-dir ./public/dist --no-source-maps --no-cache` | Production bundle |
| `debug` | `ndb server.js` | Node DevTools debugger |

**Run two terminals during dev:** one with `npm run dev`, one with `npm run watch:js`.

### 3.4 Frontend build pipeline (Parcel)
- **Input:** [public/js/index.js](public/js/index.js) — single ESM entry that imports every other module (`mapbox`, `login`, `signup`, `forgotPassword`, `resetPassword`, `updateSettings`, `alerts`, `stripe`).
- **Output:** `public/dist/index.js` (single bundled file).
- **Loaded by:** [views/base.pug:55](views/base.pug#L55) → `<script src="/dist/index.js">` (every page that extends `base.pug`).
- **Implication:** editing a file under `public/js/` does **nothing** to the browser until you re-run `npm run build:js` (or have `watch:js` running). This is the #1 cause of "my change doesn't show up." If you're debugging dead JS, first `grep "<unique-string>" public/dist/index.js` to confirm the bundle was rebuilt.

### 3.5 Stripe key separation
- **Publishable key** (`pk_test_...`) is hardcoded in [public/js/stripe.js](public/js/stripe.js) and *shipped to the browser* — that's expected.
- **Secret key** (`sk_test_...`) lives only in `prod.env` → `process.env.STRIPE_SECRET_KEY` and is used in [controllers/bookingController.js:1](controllers/bookingController.js#L1).
- **Webhook secret** (`whsec_...`) is used in [controllers/bookingController.js:79-83](controllers/bookingController.js#L79-L83) to verify Stripe signatures. Only relevant for the `/webhook-checkout` endpoint, not session creation.

---

## 4. Environment variables (`prod.env`)

`server.js` loads `./prod.env` regardless of `NODE_ENV`. The same file format is used for dev and prod; in CI/CD the production values are stored base64-encoded as the `PROD_ENV_B64` GitHub secret.

| Variable | Used by | Notes |
| --- | --- | --- |
| `NODE_ENV` | app.js (CSP, morgan), errorController (dev vs prod responses), Dockerfile sets it to `production` | `production` in prod env file too |
| `PROD_ENV` | unused at runtime; presence kept for backwards compat | |
| `DATABASE` | server.js → mongoose.connect | Full Atlas SRV/standard URI with `replicaSet`, `authSource=admin` |
| `DATABASE_PASSWORD` | unused directly (password is inside the URI) | Kept for reference |
| `PORT` | server.js | `3000` in prod (matches `-p 127.0.0.1:3000:3000` in `docker run`) |
| `API` | unused | Legacy |
| `JWT_SECRET` | authController (sign/verify) | Rotate by changing this — invalidates every existing JWT |
| `JWT_EXPIRES_IN` | sign opts | `90d` |
| `JWT_COOKIE_EXPIRES_IN` | cookie max-age | Plain number of days (no `d` suffix) |
| `EMAIL_HOST` | utils/email.js | `smtp.gmail.com` |
| `EMAIL_USERNAME` | utils/email.js | Gmail address |
| `EMAIL_PASSWORD` | utils/email.js | **Gmail App Password** (16 chars, 4 blocks of 4), not the account password. Requires 2FA on the Google account. |
| `EMAIL_PORT` | utils/email.js | `587` |
| `EMAIL_FROM` | utils/email.js | Sender shown to recipients |
| `STRIPE_SECRET_KEY` | bookingController.js | `sk_test_...` or `sk_live_...` |
| `STRIPE_WEBHOOK_SECRET` | bookingController.webhookCheckout | Issued when you configure the endpoint in the Stripe dashboard |
| `AWS_ACCESS_KEY_ID` / `AWS_SECRET_ACCESS_KEY` / `AWS_REGION` | optional — used if/when the app calls AWS APIs directly | Required by the GitHub Actions workflows as repo secrets in any case |

**The `prod.env` file is sensitive.** It is not (and must not be) committed. Confirm with `git check-ignore -v prod.env`; add it to `.gitignore` if not already.

---

## 5. The `PROD_ENV_B64` pattern (env-as-secret)

The deploy workflow does not SCP a file — it ships the entire env as a single base64 string through a GitHub secret.

### 5.1 Why
- **One secret to manage** instead of N. Rotating any value means one paste, not N updates.
- The `prod.env` file never appears in build artifacts, image layers, or logs.
- The SSH command line stays short.

### 5.2 The local copy
[prod.env:3](prod.env#L3) keeps a `PROD_ENV_B64=<value>` line that mirrors what's in the GitHub secret, purely for human reference. The runtime app reads the **decoded plaintext below it**, not the B64 line.

### 5.3 Regenerating after any change

#### Preferred — npm script (cross-platform)

```
npm run env:encode
```

What it does ([scripts/encode-env.js](scripts/encode-env.js)):

1. Reads `prod.env`.
2. Strips the existing `PROD_ENV_B64=...` line so we don't double-encode.
3. Normalizes Windows CRLF → LF (the bug that bites everyone using PowerShell heredocs).
4. Base64-encodes the remaining plaintext.
5. Writes the value to `prod.env.b64`, updates the in-file mirror at [prod.env:3](prod.env#L3), prints the value to stdout.
6. **Idempotent** — running twice produces the same B64.

End-to-end rotation workflow:

1. Edit any value in `prod.env` (e.g. rotate `STRIPE_SECRET_KEY`).
2. Run `npm run env:encode`.
3. Copy the printed B64 (also written to `prod.env.b64`) → GitHub → **Settings → Secrets and variables → Actions → `PROD_ENV_B64` → Update**.
4. Trigger a redeploy (push, empty commit, or *Run workflow*).

#### Manual fallback (no Node available)

PowerShell:
```powershell
$plain = Get-Content -Raw prod.env.b64    # or compose inline with @'...'@
$plainLF = $plain -replace "`r`n", "`n"   # IMPORTANT: convert CRLF → LF
$bytes = [System.Text.Encoding]::UTF8.GetBytes($plainLF)
[Convert]::ToBase64String($bytes)
```

Linux/Mac:
```bash
base64 -w0 prod.env.b64
```

#### Safety check — never commit these

`prod.env` and `prod.env.b64` both contain live secrets and must not be in git:

```bash
git check-ignore -v prod.env prod.env.b64
```

If the command prints nothing, the files aren't ignored — add them to `.gitignore` immediately.

### 5.4 How it's consumed on the EC2
From [.github/workflows/docker-build-push.yml:138-182](.github/workflows/docker-build-push.yml#L138-L182):
```bash
PROD_ENV_B64='<from secret>' bash -s << 'ENDSSH'
  DECODED=$(echo "${PROD_ENV_B64}" | tr -d ' \n\r\t' | base64 -d)
  echo "$DECODED" | sudo tee /opt/natours/prod.env > /dev/null
  sudo chmod 600 /opt/natours/prod.env
  # ...
  docker run ... --env-file /opt/natours/prod.env nitinkdocker18/natoursapi:vN
ENDSSH
```
The safety check at line 172-177 refuses to overwrite an existing `/opt/natours/prod.env` if the decoded payload looks empty or malformed — protects against accidentally clearing the secret.

**Line endings matter.** `base64 -d` on Linux expects LF-terminated lines once decoded; PowerShell adds CRLF by default. Always strip CRLF before encoding, or the resulting env file will have stray `\r` on every value (Mongo URI breaks, JWT secret silently changes, etc.).

---

## 6. Docker

### 6.1 Two-stage build ([Dockerfile](Dockerfile))

**Stage 1 — builder (`node:20-alpine`)**
1. Install **all** dependencies including devDeps. Parcel is a devDep but is required to build.
2. Copy `public/` and run `npm run build:js` → produces `public/dist/index.js`.

**Stage 2 — runtime (`node:20-alpine`)**
1. Install production dependencies only (`npm install --omit=dev`).
2. Copy `server.js`, `app.js`, and the directories `controllers/`, `models/`, `routes/`, `utils/`, `views/`, `public/`.
3. Copy the built `public/dist` *from the builder stage* (`COPY --from=builder`).
4. `EXPOSE 3000`; `CMD ["node", "server.js"]`.

The runtime image therefore does **not** contain Parcel, devDependencies, or source maps — keeps it small and reduces attack surface.

### 6.2 Image naming
- Repo: `nitinkdocker18/natoursapi` on Docker Hub.
- Tags written on every successful CI run: `:vN` (auto-incremented, see below) and `:latest`.
- The `vN` tag is computed by reading all existing tags from the Docker Hub API, filtering `^v[0-9]+$`, sorting numerically, and adding 1 — see [.github/workflows/docker-build-push.yml:38-58](.github/workflows/docker-build-push.yml#L38-L58). On a fresh repo with no tags it starts at `v1`.

### 6.3 Local image smoke-test
```bash
docker build -t natours-local .
docker run --rm -p 3000:3000 --env-file ./prod.env natours-local
# → http://localhost:3000
```

---

## 7. Infrastructure (Terraform)

### 7.1 What it provisions ([terraform/main.tf](terraform/main.tf))
- `aws_vpc.natours-vpc` — CIDR `10.0.0.0/16`
- `aws_subnet.natours-subnet-1` — CIDR `10.0.1.0/24`, AZ `ap-south-1a`
- `aws_internet_gateway.natours-igw` + default route table → `0.0.0.0/0`
- `aws_default_security_group.natours-sg` — opens 22, 80, 443, **3000** to the world (3000 is open mainly for debugging; in steady-state, traffic goes through Nginx)
- `aws_instance.natours-server` — `t2.micro` Ubuntu 22.04, public IP
- `aws_route53_record.natours-a` — A record `natours.nitinkdevs.com → <EC2 IP>`
- `aws_route53_record.natours-www` — A record `www.natours.nitinkdevs.com → <EC2 IP>`

The Route 53 **hosted zone** for `nitinkdevs.com` is *not* managed here (uses a `data` source). This is deliberate — the zone outlives the application; only the records pointing into it are owned by this stack.

### 7.2 Remote state
- Backend: **S3** bucket `nitinkdevs-tf-state`, key `natours/terraform.tfstate`, region `ap-south-1`, encrypted, versioned, with `use_lockfile = true` (S3-native locking — no DynamoDB needed since TF 1.10).
- The bucket is **bootstrapped by the workflow itself** ([terraform-apply.yml:48-69](.github/workflows/terraform-apply.yml#L48-L69)) on first run; it creates the bucket with versioning, encryption, and public-access block. The destroy workflow ([terraform-destroy.yml:48-69](.github/workflows/terraform-destroy.yml#L48-L69)) reverses this — wipes all object versions/delete markers, then deletes the bucket.

### 7.3 Cloud-init / user_data ([terraform/entry-script.sh](terraform/entry-script.sh))
Runs once on instance first boot, as root:
1. Adds the supplied SSH public key (derived from the `EC2_SSH_KEY` GH secret) to `/home/ubuntu/.ssh/authorized_keys`.
2. Installs `docker.io`, `nginx`, `certbot`, `python3-certbot-nginx`.
3. Enables and starts both `docker` and `nginx` systemd units.
4. Adds `ubuntu` user to the `docker` group.
5. Grants the `ubuntu` user passwordless sudo (so the deploy workflow can run `sudo docker ...`, `sudo certbot ...` over SSH).
6. Creates `/opt/natours/` to hold the env file later.

### 7.4 Required GH secrets for the Terraform pipelines
| Secret | Purpose |
| --- | --- |
| `AWS_ACCESS_KEY_ID` / `AWS_SECRET_ACCESS_KEY` | Terraform AWS provider auth |
| `EC2_SSH_KEY` | Private key; the workflow derives the public key with `ssh-keygen -y -f` and feeds it to the EC2 user-data via `TF_VAR_ec2_public_key` |
| `MY_IP` | Your home/office IP in CIDR form for SSH ingress (e.g. `203.0.113.5/32`). The SG also opens 22 to `0.0.0.0/0` as a safety fallback. |

### 7.5 Workflows for infra
- **terraform-apply.yml** — triggers on push to `terraform/**` or manual run. Bootstraps S3, imports pre-existing Route 53 records, runs `plan` then `apply`. Logs new EC2 IP / ID / AZ at the end so the deploy workflow's `EC2_HOST` etc. can be updated if you don't want it auto-discovered. (Note: the deploy workflow *also* auto-discovers via `ec2 describe-instances`, so updating those secrets is optional.)
- **terraform-destroy.yml** — manual only, requires typing `destroy` as confirmation input. Tears down everything, including the S3 state bucket. Leaves the Route 53 hosted zone untouched.

### 7.6 Why EC2 + Docker rather than ECS / Beanstalk?
Cost. A `t2.micro` is free-tier eligible; ECS Fargate is not. The trade-off is that EC2 patching, kernel upgrades, and disk fill-up are your problem — `docker image prune -af` at the end of every deploy (line 255 of the workflow) keeps disk usage in check.

---

## 8. CI/CD — the deploy workflow in detail

[.github/workflows/docker-build-push.yml](.github/workflows/docker-build-push.yml) runs on every push to `master`. It has two jobs.

### 8.1 Job 1: `build-and-push`
| Step | What it does |
| --- | --- |
| `Checkout code` | Standard. |
| `Install jq` | Used to parse the Docker Hub tags JSON. |
| `Set up Docker Buildx` | Enables BuildKit for the build. |
| `Login to Docker Hub` | Uses `DOCKERHUB_USERNAME` + `DOCKER_PASSWORD` secrets. |
| `Get next version` | Calls `https://hub.docker.com/v2/repositories/nitinkdocker18/natoursapi/tags?page_size=100`, regex-filters `^v[0-9]+$`, sorts numerically, increments, exposes `version=v<N>` as a job output. |
| `Build and Push Docker Image` | `docker/build-push-action@v5` builds from the repo root (`Dockerfile`) and pushes both `:vN` and `:latest`. |
| `Print image info` | Logs the tags for humans. |

### 8.2 Job 2: `deploy` (`needs: build-and-push`)
Env carries `AWS_*` for the EC2 discovery and `IMAGE_TAG` from the previous job's output.

| Step | What it does |
| --- | --- |
| `Discover EC2 instance by tag` | `aws ec2 describe-instances` filtered by `tag:Name=prod-server` + `running`. Aborts the deploy if no match — that means terraform-apply hasn't run yet. |
| `Setup SSH key` | Writes the private key from `EC2_SSH_KEY` to `~/.ssh/deploy_key`, generates a `.pub` for the next step. |
| `Wait for SSH to be reachable` | Loops `nc -z` on port 22 up to 30 × 10s. Adds the host key to `known_hosts` via `ssh-keyscan`. |
| `Push key via EC2 Instance Connect` | `aws ec2-instance-connect send-ssh-public-key` — gives the public key a **60-second window** of authorized access on the instance. This is the auth mechanism for the SSH call below; the host doesn't have the key permanently. Side note: even though `entry-script.sh` already added a key, this provides a fallback path that always works even after AMI re-creations. |
| `Deploy to EC2` | The substance — see §8.3. |

### 8.3 What the `Deploy to EC2` step does on the host (line 138-257)
The workflow opens an SSH session with the `PROD_ENV_B64` value passed inline (so the secret never lands on disk in CI), then runs this script under `bash -s`:

1. **Install Nginx + Certbot** if not already present (idempotent — `entry-script.sh` does it on first boot, this catches AMIs that didn't run cloud-init).
2. **Install Docker** if not already present (same rationale).
3. **Decode the env file** — `echo "$PROD_ENV_B64" | tr -d ' \n\r\t' | base64 -d > /opt/natours/prod.env`. Refuses to clobber if decoded payload is suspiciously short.
4. **Write Nginx config** — the live config is a heredoc inside the workflow, not the file in `nginx/`. It defines a single `server` block: `listen 80`, server_name `natours.nitinkdevs.com` + `www`, `proxy_pass http://localhost:3000` with the standard `X-Forwarded-*` headers. Symlinks into `sites-enabled`, removes the default config, runs `nginx -t`.
5. **Obtain SSL cert** — if `/etc/letsencrypt/live/$DOMAIN` does not exist, runs `certbot --nginx --non-interactive --agree-tos -d natours.nitinkdevs.com -d www.natours.nitinkdevs.com`. Certbot edits the Nginx config in place to add the `listen 443 ssl` block and HTTP→HTTPS redirect, then reloads. If DNS isn't propagated yet, it logs a warning and continues on HTTP.
6. **Pull and run the container**:
   ```bash
   sudo docker pull nitinkdocker18/natoursapi:vN
   sudo docker stop app || true
   sudo docker rm app || true
   sudo docker run -d \
     --name app --restart always \
     -p 127.0.0.1:3000:3000 \
     --env-file /opt/natours/prod.env \
     nitinkdocker18/natoursapi:vN
   ```
   Note `127.0.0.1:3000:3000` — the container is *not* exposed on the public interface. Only Nginx can reach it.
7. **Health-check** — `curl -fs http://localhost:3000` in a 30 × 2s loop. If it never comes up, dumps `docker ps -a` + `docker logs app --tail 100` + the first 5 lines of `prod.env` (with values redacted), then `exit 1`.
8. **Cleanup** — `docker image prune -af` after a successful deploy.

### 8.4 Required GH secrets for the deploy pipeline
| Secret | Used in |
| --- | --- |
| `DOCKERHUB_USERNAME`, `DOCKER_PASSWORD` | docker login |
| `AWS_ACCESS_KEY_ID`, `AWS_SECRET_ACCESS_KEY` | EC2 discovery, EC2 Instance Connect |
| `EC2_SSH_KEY` | SSH private key |
| `EC2_USER` | Usually `ubuntu` |
| `PROD_ENV_B64` | The base64 env payload (§5) |

---

## 9. End-to-end deploy timeline (typical push)

```
t=0s    git push origin master
t=2s    GH Actions: build-and-push job starts
t=5s    docker buildx pull base image, run npm install --include=dev (~30s)
t=40s   parcel build → public/dist/index.js
t=45s   stage 2: npm install --omit=dev
t=70s   push image to Docker Hub (vN + latest)
t=80s   deploy job starts, describes EC2, sets up SSH
t=95s   ssh into instance, decode env, ensure nginx/docker present
t=100s  docker pull vN
t=120s  docker stop app && docker rm app && docker run new container
t=120s  app boots (mongoose connects to Atlas ~2-5s)
t=125s  health check passes
t=130s  docker image prune; workflow done
```

Total: ~2-3 minutes from `git push` to traffic served by the new container.

---

## 10. Runtime behavior worth knowing

### 10.1 Trust-proxy + Stripe URLs
[app.js:24](app.js#L24) sets `app.set('trust proxy', 1)` so `req.ip` and `req.secure` reflect the real client, not Nginx. The Stripe controller additionally honors `X-Forwarded-Proto` ([controllers/bookingController.js:18-22](controllers/bookingController.js#L18-L22)) to ensure success/cancel URLs and image URLs use `https://` even though Node sees plain `http://` from the local Nginx hop.

### 10.2 Stripe webhook must come before `express.json()`
[app.js:88-93](app.js#L88-L93) mounts `/webhook-checkout` with `express.raw({type: 'application/json'})` *before* the JSON body parser. Stripe signs the raw bytes; if Express parses the JSON first, the signature won't match and `webhookCheckout` will 400 every event.

### 10.3 CSP includes Mapbox/Stripe
[app.js:30-74](app.js#L30-L74) — be careful when adding new third-party scripts. They must be added to `scriptSrc`/`scriptSrcElem`, and any new XHR/WebSocket targets to `connectSrc`.

### 10.4 Booking flow (current state)
1. Logged-in user clicks **Book tour now!** ([views/tour.pug:122](views/tour.pug#L122)) — a `<button>` with `data-tour-id`.
2. [public/js/index.js](public/js/index.js) handler reads `data-tour-id` and calls `bookTour(tourId)` from [public/js/stripe.js](public/js/stripe.js).
3. `bookTour` does `axios GET /api/v1/bookings/checkout-session/:tourId`.
4. [controllers/bookingController.js](controllers/bookingController.js) `getCheckoutSession` calls `stripe.checkout.sessions.create({...})` and returns `{status, session}` JSON.
5. Frontend calls `stripe.redirectToCheckout({sessionId: session.id})` → Stripe-hosted Checkout.
6. On success, Stripe redirects user → `<host>/my-tours?alert=booking` (handled by viewsController.alerts).
7. **Out-of-band:** Stripe POSTs `checkout.session.completed` to `<host>/webhook-checkout`. `webhookCheckout` verifies the signature and creates the `Booking` row in Mongo.

### 10.5 Email transport (Gmail)
[utils/email.js](utils/email.js) always uses Gmail via nodemailer (the SendGrid branch was removed). The Gmail account at `EMAIL_USERNAME` must have 2FA enabled and `EMAIL_PASSWORD` must be a 16-character Gmail App Password.

---

## 11. Operational runbook

### 11.1 Deploy a code change
```
git commit -am "your change"
git push origin master
# watch the run at Actions → Build and Deploy
```
If the JS or pug changed, the Dockerfile rebuilds the bundle automatically. If only `terraform/**` changed, the deploy workflow is skipped and only `terraform-apply` runs.

### 11.2 Re-deploy without code change
GitHub → Actions → **Build and Deploy** → *Run workflow* on the `master` branch.
(There's no `workflow_dispatch` configured currently — to enable, add `workflow_dispatch:` under `on:` in the workflow file. Right now you'd push an empty commit: `git commit --allow-empty -m "redeploy"`.)

### 11.3 Rotate a secret
1. Edit `prod.env` locally with the new value.
2. Run `npm run env:encode` (see §5.3).
3. Paste the printed B64 into GitHub → Settings → Secrets → `PROD_ENV_B64`.
4. Trigger a redeploy (push or empty commit).

### 11.4 SSH into the box
```bash
# the deploy key already on disk works; ec2-instance-connect can also push a temp key:
aws ec2-instance-connect send-ssh-public-key \
  --instance-id <id> --availability-zone ap-south-1a \
  --instance-os-user ubuntu --ssh-public-key file://~/.ssh/id_ed25519.pub
ssh -i ~/.ssh/id_ed25519 ubuntu@<ec2-public-ip>
```

### 11.5 Inspect the running container
```bash
sudo docker ps
sudo docker logs app --tail 200 -f
sudo docker exec app printenv | grep -E "NODE_ENV|DATABASE|STRIPE_|EMAIL_"   # ❗ secrets — don't paste publicly
sudo docker exec app sh                                                       # interactive shell inside container
```

### 11.6 Pin a specific image version
Manually:
```bash
sudo docker stop app && sudo docker rm app
sudo docker run -d --name app --restart always \
  -p 127.0.0.1:3000:3000 --env-file /opt/natours/prod.env \
  nitinkdocker18/natoursapi:v<old>
```

### 11.7 Renew TLS cert
Certbot installs a systemd timer that auto-renews. Force one manually:
```bash
sudo certbot renew --force-renewal
sudo systemctl reload nginx
```

### 11.8 Disk full on the EC2
The workflow prunes images after each deploy, but if something fails mid-deploy:
```bash
sudo docker system df
sudo docker system prune -af --volumes      # nuclear option, removes stopped containers and unused images/volumes
sudo journalctl --vacuum-time=7d
```

### 11.9 Tear down everything
GitHub → Actions → **Terraform Destroy** → *Run workflow* → type `destroy`.
Everything in `terraform/main.tf` plus the S3 state bucket is removed. The Route 53 hosted zone (and its NS records at the registrar) survive.

---

## 12. Troubleshooting (issues actually encountered)

### 12.1 `Booking could not be completed. Please try again later or contact support.`
That string lives in [controllers/viewsController.js:13-15](controllers/viewsController.js#L13-L15) and renders when the URL has `?alert=booking_failed`. The server-side path that *can* set that query param is `[OLD]` — current code returns JSON instead. If you still see it, the cause is one of:
- Stripe `checkout.sessions.create()` threw on the server. The real reason is logged at [controllers/bookingController.js:53](controllers/bookingController.js#L53). Typical causes: `STRIPE_SECRET_KEY` missing/invalid in the container, or the `images[]` URL is not publicly reachable.
- A stale parcel bundle is still loading from the browser cache. Hard-refresh (Ctrl+Shift+R) and confirm `public/dist/index.js` contains the latest handler.

### 12.2 `There is an error sending the email. Try again later!`
- `EMAIL_PASSWORD` is not a Gmail App Password (e.g. it's the account password, or expired).
- Gmail account doesn't have 2FA enabled (App Passwords require it).
- AWS is blocking outbound port 587 from your EC2. Test from the host with `nc -vz smtp.gmail.com 587`.

### 12.3 "My JS change isn't visible"
You forgot to run `npm run build:js`. The browser loads [public/dist/index.js](public/dist/index.js), not the source.

### 12.4 Stripe webhook silently does nothing
- Wrong `STRIPE_WEBHOOK_SECRET` in env — signature verification fails, the endpoint returns 400, but the booking page already showed "success". The order of middleware in [app.js](app.js) matters: webhook must come before `express.json()`.
- Endpoint URL in the Stripe dashboard doesn't match the deployed URL (e.g. `http://` instead of `https://`).

### 12.5 `PROD_ENV_B64` decodes to garbled values
You encoded with CRLF line endings. Re-encode after converting to LF (§5.3).

### 12.6 GitHub Actions: "No running EC2 instance with tag Name=prod-server found"
Run the **Terraform Apply** workflow first. The deploy workflow requires the infra to already exist; it does not provision it.

### 12.7 Certbot fails on first deploy
DNS hadn't propagated yet at the moment certbot ran. The workflow continues on HTTP. Re-deploy a few minutes later and certbot will succeed because `/etc/letsencrypt/live/$DOMAIN` is still missing.

---

## 13. Security notes

- **Secrets in source control**: `prod.env` and `prod.env.b64` contain live credentials. Both must be in `.gitignore`. If you're forking this repo, **rotate every secret immediately** before doing anything else.
- **SSH on `0.0.0.0/0`**: the SG opens port 22 to the world. The mitigation is key-only auth (no passwords) and EC2 Instance Connect's short-lived keys. Tightening this to `var.my_ip` only is a 1-line change in [terraform/main.tf:74](terraform/main.tf#L74).
- **Port 3000 open publicly**: same SG opens 3000 to the world. Nginx already listens on 80/443; the container itself binds only to 127.0.0.1, so port 3000 isn't actually serving anything externally. Close it for cleanliness if you want.
- **JWT_SECRET rotation invalidates all sessions** — every user has to log in again. Plan accordingly.
- **AWS IAM**: The `AWS_ACCESS_KEY_ID` in `prod.env` is an actual key. For a production-grade setup, the EC2 should use an **IAM instance profile** instead of long-lived access keys baked into the container.

---

## 14. Quick reference card

```
Production URL          https://natours.nitinkdevs.com
EC2 region              ap-south-1 (Mumbai)
EC2 instance type       t2.micro
EC2 tag                 Name=prod-server
Docker image            nitinkdocker18/natoursapi:{vN | latest}
App port (container)    3000 (bound to 127.0.0.1)
App env file (on host)  /opt/natours/prod.env
Nginx config            /etc/nginx/sites-available/natours
TLS certs               /etc/letsencrypt/live/natours.nitinkdevs.com/
DB                      MongoDB Atlas (replicaSet=atlas-1l7h8i-shard-0)
TF state                s3://nitinkdevs-tf-state/natours/terraform.tfstate
Image registry          hub.docker.com/r/nitinkdocker18/natoursapi
```

GitHub Actions (workflows):
- **Build and Deploy** — on push to `master`. Builds image, pushes, deploys.
- **Terraform Apply** — on push to `terraform/**` or manual. Provisions infra.
- **Terraform Destroy** — manual only, requires `destroy` confirmation. Tears it all down.

Required GitHub secrets:
```
AWS_ACCESS_KEY_ID
AWS_SECRET_ACCESS_KEY
DOCKERHUB_USERNAME
DOCKER_PASSWORD
EC2_SSH_KEY            (private key, PEM)
EC2_USER               (= ubuntu)
MY_IP                  (CIDR, e.g. 1.2.3.4/32)
PROD_ENV_B64           (base64 of prod env file with LF endings)
```
