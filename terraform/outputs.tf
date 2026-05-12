output "ec2_public_ip" {
  value       = aws_instance.natours-server.public_ip
  description = "Public IP of the EC2 instance — update EC2_HOST secret in GitHub"
}

output "ec2_public_dns" {
  value = aws_instance.natours-server.public_dns
}
