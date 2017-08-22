# Securing Node apps using CleverAuth

### Why microservices?

There are [several people](https://www.oreilly.com/ideas/4-reasons-why-microservices-resonate) who [have made the case](https://blog.heroku.com/why_microservices_matter) for microservices [way better](https://gustafnk.github.io/microservice-websites/#why-microservices) than I could. Feel free to go read what they've said. I'll wait.

### Why _this_ microservice?

CleverAuth does four things for you, right out of the box:

1. CleverAuth handles user registration, with configurable fields. Don't need names? Don't use them. Don't want people making 100 accounts a minute? Require email confirmation.
2. CleverAuth handles user authentication, with two-factor authentication optional.
3. CleverAuth interfaces with three of the most popular databases, without any additional monkeying: MySQL, PostgreSQL, and MongoDB.
4. CleverAuth plugs right into your existing email provider, making setup trivial. Currently supported are: Amazon SES, Sendgrid, Postmark, and Mailgun.

### Okay, so how does it work?

![CleverAuth Flowchart](/resources/flowchart.png)

1. [Add CleverAuth to your existing Node API](https://github.com/clevertech/authentication-service/tree/master#usage-as-an-express-router) or [run it as a standalone server](https://github.com/clevertech/authentication-service/tree/master#running-as-a-command-line-application), and route your users' signin requests to CleverAuth (already handled if you use it as an express router).
2. CleverAuth will return a signed JWT on a successful signin, which your frontend UI should send along with the request on subsequent requests
3. Configure the rest of your API to decode the JWTs with the same secret (configurable in CleverAuth), to confirm that the user is who they say they are.

#### That's it!
