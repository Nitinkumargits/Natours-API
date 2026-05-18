#!/bin/bash
# Delete one or more VPCs along with all their dependent resources.
# Usage: bash scripts/delete-vpc.sh vpc-aaaa vpc-bbbb ...

set -e

REGION=ap-south-1

if [ $# -eq 0 ]; then
  echo "Usage: $0 <vpc-id> [vpc-id ...]"
  exit 1
fi

for VPC_ID in "$@"; do
  echo ""
  echo "===== Cleaning VPC $VPC_ID ====="

  # 1. Terminate EC2 instances in this VPC
  INSTANCE_IDS=$(aws ec2 describe-instances --region $REGION \
    --filters "Name=vpc-id,Values=$VPC_ID" "Name=instance-state-name,Values=pending,running,stopping,stopped" \
    --query 'Reservations[].Instances[].InstanceId' --output text)
  if [ -n "$INSTANCE_IDS" ]; then
    echo "Terminating instances: $INSTANCE_IDS"
    aws ec2 terminate-instances --region $REGION --instance-ids $INSTANCE_IDS >/dev/null
    aws ec2 wait instance-terminated --region $REGION --instance-ids $INSTANCE_IDS
    echo "Instances terminated."
  else
    echo "No running instances."
  fi

  # 2. Delete orphan ENIs (network interfaces not attached to anything)
  for ENI in $(aws ec2 describe-network-interfaces --region $REGION \
    --filters "Name=vpc-id,Values=$VPC_ID" \
    --query 'NetworkInterfaces[?Status==`available`].NetworkInterfaceId' --output text); do
    echo "Deleting ENI $ENI"
    aws ec2 delete-network-interface --region $REGION --network-interface-id $ENI || true
  done

  # 3. Detach + delete Internet Gateways
  for IGW in $(aws ec2 describe-internet-gateways --region $REGION \
    --filters "Name=attachment.vpc-id,Values=$VPC_ID" \
    --query 'InternetGateways[].InternetGatewayId' --output text); do
    echo "Detaching IGW $IGW"
    aws ec2 detach-internet-gateway --region $REGION --internet-gateway-id "$IGW" --vpc-id "$VPC_ID"
    aws ec2 delete-internet-gateway --region $REGION --internet-gateway-id "$IGW"
  done

  # 4. Delete subnets
  for SUBNET in $(aws ec2 describe-subnets --region $REGION \
    --filters "Name=vpc-id,Values=$VPC_ID" \
    --query 'Subnets[].SubnetId' --output text); do
    echo "Deleting subnet $SUBNET"
    aws ec2 delete-subnet --region $REGION --subnet-id "$SUBNET"
  done

  # 5. Delete non-main route tables
  for RT in $(aws ec2 describe-route-tables --region $REGION \
    --filters "Name=vpc-id,Values=$VPC_ID" \
    --query 'RouteTables[?length(Associations)==`0` || Associations[0].Main!=`true`].RouteTableId' --output text); do
    echo "Deleting route table $RT"
    aws ec2 delete-route-table --region $REGION --route-table-id "$RT" || true
  done

  # 6. Delete non-default security groups
  for SG in $(aws ec2 describe-security-groups --region $REGION \
    --filters "Name=vpc-id,Values=$VPC_ID" \
    --query 'SecurityGroups[?GroupName!=`default`].GroupId' --output text); do
    echo "Deleting security group $SG"
    aws ec2 delete-security-group --region $REGION --group-id "$SG" || true
  done

  # 7. Delete the VPC
  echo "Deleting VPC $VPC_ID"
  aws ec2 delete-vpc --region $REGION --vpc-id "$VPC_ID"

  echo "===== Done with $VPC_ID ====="
done

echo ""
echo "All requested VPCs cleaned up. Verifying remaining VPCs:"
aws ec2 describe-vpcs --region $REGION \
  --query 'Vpcs[].[VpcId,IsDefault,Tags[?Key==`Name`].Value|[0]]' \
  --output table
