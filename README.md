# GFW Contact API

[![Build Status](https://app.travis-ci.com/gfw-api/gfw-contact-api.svg?branch=dev)](https://app.travis-ci.com/gfw-api/gfw-contact-api)
[![Test Coverage](https://api.codeclimate.com/v1/badges/fab79a90388b1e5fe157/test_coverage)](https://codeclimate.com/github/gfw-api/gfw-contact-api/test_coverage)

This repository is the microservice that implements the contact functionality


## Dependencies

The GFW Contact API microservice is built using [Node.js](https://nodejs.org/en/), and can be executed either natively or using Docker, each of which has its own set of requirements.

Native execution requires:
- [Node.js](https://nodejs.org/en/)

Execution using Docker requires:
- [Docker](https://www.docker.com/)
- [Docker Compose](https://docs.docker.com/compose/)

Dependencies on other Microservices:
- [GFW User](https://github.com/gfw-api/gfw-user-api)

## Getting started

Start by cloning the repository from github to your execution environment

```
git clone https://github.com/gfw-api/gfw-contact-api.git && cd gfw-contact-api
```

After that, follow one of the instructions below:

### Using native execution

1 - Set up your environment variables. See `dev.env.sample` for a list of variables you should set, which are described in detail in [this section](#environment-variables) of the documentation. Native execution will NOT load the `dev.env` file content, so you need to use another way to define those values

2 - Install node dependencies using yarn:
```
yarn
```

3 - Start the application server:
```
yarn start
```

The endpoints provided by this microservice should now be available through Control Tower's URL.

### Using Docker

1 - Create and complete your `dev.env` file with your configuration. The meaning of the variables is available in this [section](#configuration-environment-variables). You can find an example `dev.env.sample` file in the project root.

2 - Execute the following command to run Control tower:

```
./contact.sh develop
```

The endpoints provided by this microservice should now be available through Control Tower's URL.

## Testing

There are two ways to run the included tests:

### Using native execution

Follow the instruction above for setting up the runtime environment for native execution, then run:
```
yarn test
```

### Using Docker

Follow the instruction above for setting up the runtime environment for Docker execution, then run:
```
./contact.sh test
```

### Configuration

It is necessary to define these environment variables:

* GATEWAY_URL => Gateway URL
* NODE_ENV => Environment (prod, staging, dev)
