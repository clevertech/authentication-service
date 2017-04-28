const querystring = require('querystring')

module.exports = (env, fetch) => {
  const accountSid = env('TWILIO_ACCOUNT_SID')
  const authToken = env('TWILIO_AUTH_TOKEN')
  const numberFrom = env('TWILIO_NUMBER_FROM')

  // See https://www.twilio.com/docs/api/rest/sending-messages
  return {
    send (numberTo, text) {
      const url = `https://api.twilio.com/2010-04-01/Accounts/${accountSid}/Messages.json`
      const body = {
        To: numberTo,
        From: numberFrom,
        Body: text
      }
      return fetch(url, {
        method: 'POST',
        body: querystring.stringify(body),
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
          'Authorization': 'Basic ' + new Buffer(accountSid + ':' + authToken).toString('base64')
        }
      })
      .then(res => {
        return res.json()
          .then(json => {
            if (res.status >= 400) {
              return Promise.reject(new Error(`Twilio returned ${res.status}. ${json.code} ${json.message} ${json.more_info}`))
            }
          })
          .catch(err => {
            return Promise.reject(new Error(`Twilio returned ${res.status}. ${err.message || String(err)}`))
          })
      })
      .then(json => {
        console.log('json', json)
      })
    }
  }
}
