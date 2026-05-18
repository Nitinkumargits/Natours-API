# Delete one or more VPCs along with all their dependent resources.
# Usage: powershell -File scripts/delete-vpc.ps1 vpc-aaaa vpc-bbbb ...

param([Parameter(ValueFromRemainingArguments=$true)][string[]]$VpcIds)

$ErrorActionPreference = "Stop"
$REGION = "ap-south-1"

if (-not $VpcIds -or $VpcIds.Count -eq 0) {
    Write-Host "Usage: powershell -File scripts/delete-vpc.ps1 <vpc-id> [vpc-id ...]"
    exit 1
}

foreach ($VPC_ID in $VpcIds) {
    Write-Host ""
    Write-Host "===== Cleaning VPC $VPC_ID ====="

    # 1. Terminate EC2 instances
    $instances = aws ec2 describe-instances --region $REGION `
        --filters "Name=vpc-id,Values=$VPC_ID" "Name=instance-state-name,Values=pending,running,stopping,stopped" `
        --query "Reservations[].Instances[].InstanceId" --output text
    if ($instances) {
        $idList = $instances -split "\s+" | Where-Object { $_ }
        Write-Host "Terminating instances: $idList"
        aws ec2 terminate-instances --region $REGION --instance-ids $idList | Out-Null
        aws ec2 wait instance-terminated --region $REGION --instance-ids $idList
        Write-Host "Instances terminated."
    } else {
        Write-Host "No running instances."
    }

    # 2. Delete orphan ENIs
    $enis = aws ec2 describe-network-interfaces --region $REGION `
        --filters "Name=vpc-id,Values=$VPC_ID" `
        --query "NetworkInterfaces[?Status=='available'].NetworkInterfaceId" --output text
    if ($enis) {
        foreach ($eni in ($enis -split "\s+" | Where-Object { $_ })) {
            Write-Host "Deleting ENI $eni"
            try { aws ec2 delete-network-interface --region $REGION --network-interface-id $eni } catch {}
        }
    }

    # 3. Detach + delete Internet Gateways
    $igws = aws ec2 describe-internet-gateways --region $REGION `
        --filters "Name=attachment.vpc-id,Values=$VPC_ID" `
        --query "InternetGateways[].InternetGatewayId" --output text
    if ($igws) {
        foreach ($igw in ($igws -split "\s+" | Where-Object { $_ })) {
            Write-Host "Detaching/deleting IGW $igw"
            aws ec2 detach-internet-gateway --region $REGION --internet-gateway-id $igw --vpc-id $VPC_ID
            aws ec2 delete-internet-gateway --region $REGION --internet-gateway-id $igw
        }
    }

    # 4. Delete subnets
    $subnets = aws ec2 describe-subnets --region $REGION `
        --filters "Name=vpc-id,Values=$VPC_ID" `
        --query "Subnets[].SubnetId" --output text
    if ($subnets) {
        foreach ($s in ($subnets -split "\s+" | Where-Object { $_ })) {
            Write-Host "Deleting subnet $s"
            aws ec2 delete-subnet --region $REGION --subnet-id $s
        }
    }

    # 5. Delete non-main route tables
    $rts = aws ec2 describe-route-tables --region $REGION `
        --filters "Name=vpc-id,Values=$VPC_ID" `
        --query "RouteTables[?length(Associations)==``0`` || Associations[0].Main!=``true``].RouteTableId" --output text
    if ($rts) {
        foreach ($rt in ($rts -split "\s+" | Where-Object { $_ })) {
            Write-Host "Deleting route table $rt"
            try { aws ec2 delete-route-table --region $REGION --route-table-id $rt } catch {}
        }
    }

    # 6. Delete non-default security groups
    $sgs = aws ec2 describe-security-groups --region $REGION `
        --filters "Name=vpc-id,Values=$VPC_ID" `
        --query "SecurityGroups[?GroupName!='default'].GroupId" --output text
    if ($sgs) {
        foreach ($sg in ($sgs -split "\s+" | Where-Object { $_ })) {
            Write-Host "Deleting security group $sg"
            try { aws ec2 delete-security-group --region $REGION --group-id $sg } catch {}
        }
    }

    # 7. Delete the VPC
    Write-Host "Deleting VPC $VPC_ID"
    aws ec2 delete-vpc --region $REGION --vpc-id $VPC_ID

    Write-Host "===== Done with $VPC_ID ====="
}

Write-Host ""
Write-Host "All requested VPCs cleaned up. Remaining VPCs:"
aws ec2 describe-vpcs --region $REGION `
    --query "Vpcs[].[VpcId,IsDefault,Tags[?Key=='Name'].Value|[0]]" `
    --output table
