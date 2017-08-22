# Securing Node apps using CTAuth

## Why microservices?

There are [several people](https://www.oreilly.com/ideas/4-reasons-why-microservices-resonate) who [have made the case](https://blog.heroku.com/why_microservices_matter) for microservices [way better](https://gustafnk.github.io/microservice-websites/#why-microservices) than I could. Feel free to go read what they've said. I'll wait.

## Why _this_ microservice?

CTAuth does four things for you, right out of the box:

1. CTAuth handles user registration, with configurable fields. Don't need names? Don't use them. Don't want people making 100 accounts a minute? Require email confirmation.
2. CTAuth handles user authentication, with two-factor authentication optional.
3. CTAuth interfaces with three of the most popular databases, without any additional monkeying: MySQL, PostgreSQL, and MongoDB.
4. CTAuth plugs right into your existing email provider, making setup trivial. Currently supported are: Amazon SES, Sendgrid, Postmark, and Mailgun.

