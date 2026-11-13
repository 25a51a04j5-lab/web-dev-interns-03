const app = require('./app');
const env = require('./config/env');

app.listen(env.port, () => {
  console.log(`ATS backend listening on http://localhost:${env.port}`);
});
