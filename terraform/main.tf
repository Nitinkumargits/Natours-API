terraform {
  required_version = ">= 1.0"

  required_providers {
    aws = {
      source  = "hashicorp/aws"
      version = "~> 5.0"
    }
  }

  backend "s3" {
    bucket       = "nitinkdevs-tf-state"
    key          = "natours/terraform.tfstate"
    region       = "ap-south-1"
    use_lockfile = true
    encrypt      = true
  }
}

provider "aws" {
  region = var.region
}

# ── VPC ──────────────────────────────────────────────────────────────────────

resource "aws_vpc" "natours-vpc" {
  cidr_block = var.vpc_cidr_block
  tags = {
    Name = "${var.env_prefix}-vpc"
  }
}

resource "aws_subnet" "natours-subnet-1" {
  vpc_id            = aws_vpc.natours-vpc.id
  cidr_block        = var.subnet_cidr_block
  availability_zone = var.avail_zone
  tags = {
    Name = "${var.env_prefix}-subnet-1"
  }
}

resource "aws_internet_gateway" "natours-igw" {
  vpc_id = aws_vpc.natours-vpc.id
  tags = {
    Name = "${var.env_prefix}-igw"
  }
}

resource "aws_default_route_table" "main-rtb" {
  default_route_table_id = aws_vpc.natours-vpc.default_route_table_id

  route {
    cidr_block = "0.0.0.0/0"
    gateway_id = aws_internet_gateway.natours-igw.id
  }

  tags = {
    Name = "${var.env_prefix}-main-rtb"
  }
}

# ── Security Group ────────────────────────────────────────────────────────────

resource "aws_default_security_group" "natours-sg" {
  vpc_id = aws_vpc.natours-vpc.id

  ingress {
    from_port   = 22
    to_port     = 22
    protocol    = "tcp"
    cidr_blocks = [var.my_ip, "0.0.0.0/0"]
  }

  ingress {
    from_port   = 80
    to_port     = 80
    protocol    = "tcp"
    cidr_blocks = ["0.0.0.0/0"]
  }

  ingress {
    from_port   = 443
    to_port     = 443
    protocol    = "tcp"
    cidr_blocks = ["0.0.0.0/0"]
  }

    ingress {
    from_port   = 3000
    to_port     = 3000
    protocol    = "tcp"
    cidr_blocks = ["0.0.0.0/0"]
  }

  egress {
    from_port       = 0
    to_port         = 0
    protocol        = "-1"
    cidr_blocks     = ["0.0.0.0/0"]
    prefix_list_ids = []
  }

  tags = {
    Name = "${var.env_prefix}-sg"
  }
}



# ── AMI (Ubuntu 22.04 LTS) ────────────────────────────────────────────────────

data "aws_ami" "ubuntu" {
  most_recent = true
  owners      = ["099720109477"] # Canonical

  filter {
    name   = "name"
    values = ["ubuntu/images/hvm-ssd/ubuntu-jammy-22.04-amd64-server-*"]
  }

  filter {
    name   = "virtualization-type"
    values = ["hvm"]
  }
}

# ── EC2 Instance ──────────────────────────────────────────────────────────────

resource "aws_instance" "natours-server" {
  ami           = data.aws_ami.ubuntu.id
  instance_type = var.instance_type

  subnet_id              = aws_subnet.natours-subnet-1.id
  vpc_security_group_ids = [aws_default_security_group.natours-sg.id]
  availability_zone      = var.avail_zone

  associate_public_ip_address = true

  user_data = templatefile("${path.module}/entry-script.sh", {
    public_key = var.ec2_public_key
  })

  tags = {
    Name = "${var.env_prefix}-server"
  }
}

# ── Route 53 DNS ──────────────────────────────────────────────────────────────

data "aws_route53_zone" "natours" {
  name         = var.root_domain
  private_zone = false
}

resource "aws_route53_record" "natours-a" {
  zone_id         = data.aws_route53_zone.natours.zone_id
  name            = var.domain
  type            = "A"
  ttl             = 300
  records         = [aws_instance.natours-server.public_ip]
  allow_overwrite = true
}

resource "aws_route53_record" "natours-www" {
  zone_id         = data.aws_route53_zone.natours.zone_id
  name            = "www.${var.domain}"
  type            = "A"
  ttl             = 300
  records         = [aws_instance.natours-server.public_ip]
  allow_overwrite = true
}
