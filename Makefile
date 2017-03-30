NS = 412241670359.dkr.ecr.us-east-1.amazonaws.com/clevertech
VERSION ?= latest

REPO = boilerplate-api
NAME = boilerplate-api
INSTANCE = default
PORTS = -p 3000:3000
ENV = \
  -e NODE_ENV=development

.PHONY: build push shell test run start stop rm release

build:
	docker build -t $(NS)/$(REPO):$(VERSION) .

push:
	docker push $(NS)/$(REPO):$(VERSION)

shell:
	docker run --rm --name $(NAME)-$(INSTANCE) -i -t $(PORTS) $(VOLUMES) $(ENV) $(NS)/$(REPO):$(VERSION) /bin/bash

test:
	docker run --rm $(NS)/$(REPO):$(VERSION) yarn test

run:
	docker run --rm --name $(NAME)-$(INSTANCE) $(PORTS) $(VOLUMES) $(ENV) $(NS)/$(REPO):$(VERSION)

start:
	docker run -d --name $(NAME)-$(INSTANCE) $(PORTS) $(VOLUMES) $(ENV) $(NS)/$(REPO):$(VERSION)

stop:
	docker stop $(NAME)-$(INSTANCE)

rm:
	docker rm $(NAME)-$(INSTANCE)

release: build
	make push -e VERSION=$(VERSION)

default: build
