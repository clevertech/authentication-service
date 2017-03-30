# Authentication service

## Usage as a microservice

```bash
# Install dependencies
yarn

# Example usage
AUTH_PROJECT_NAME=Clevertech \
AUTH_GOOGLE_CLIENT_ID=111 \
AUTH_GOOGLE_CLIENT_SECRET=222 \
AUTH_JWT_SECRET=shhhh \
AUTH_REDIRECT_URL=http://example.com \
node src/index.js
```

Visit `http://127.0.0.1:3000/auth`

Click on `Connect with Google`

Note: all ENV variables are prefixed with `AUTH_`. If there's no such env variable it will look for the variable without prefix.


## Usage as an express router

```javascript
const app = express()
const router = require('authentication-service').createRouter()

app.use('/auth', router) // you can choose any path
```
