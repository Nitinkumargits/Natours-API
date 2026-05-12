variable "region" {
  default = "ap-south-1"
}

variable "vpc_cidr_block" {
  default = "10.0.0.0/16"
}

variable "subnet_cidr_block" {
  default = "10.0.1.0/24"
}

variable "avail_zone" {
  default = "ap-south-1a"
}

variable "env_prefix" {
  default = "prod"
}

variable "instance_type" {
  default = "t2.micro"
}

variable "key_pair_name" {
  default = "kp_natoursapi.pem"
}

variable "domain" {
  default = "nitinkdevs.com"
}

variable "my_ip" {
  description = "Your IP in CIDR notation for SSH access, e.g. 1.2.3.4/32"
  sensitive   = true
}

variable "ec2_public_key" {
  description = "SSH public key derived from EC2_SSH_KEY"
  sensitive   = true
}

