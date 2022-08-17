# adobe-umapi-js
Interact with the Adobe User Management API from node.js

## Example

```js
const fs = require('fs').promises;
const UMAPI = require('adobe-umapi-js');

(async () => {
    const privateKey = await fs.readFile('/path/to/your/private.key', 'utf8');
    const config = {
        clientID: 'Your client ID',
        clientSecret: 'Your client secret',
        techAccount: 'Your technical account ID',
        orgID: 'Your organization ID',
        privateKey,
    };
    const umapi = new UMAPI.Client(config);
    try {
        const ui = await umapi.getUserInformation('some_user@some_domain');
        console.log(ui);
    } catch (err) {
        console.error(err);
    }
})();
```

## Notes

See the Client constructor in `index.js` for other options that can be specified in your Client config object if you wish to override the defaults.

This is a bare minimum implementation to meet my present needs. Future developments would include:
- Request throttling and backoff
- Per-endpoint request limits
- A Pool object with multiple clients for better throughput (there are per-client request limits and per-application limits)
- Helper methods for other API endpoints (user action, user group action, get groups & profiles, etc.)