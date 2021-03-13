const path = require('path');
const fastify = require('fastify')({logger: true});
const fastifyStatic = require('fastify-static');
const axios = require('axios').default;

const TFL_API_KEY = process.env.TFL_API_KEY;

fastify.register(fastifyStatic, {
  root: path.join(__dirname, 'dist'),
})

// Declare a route
fastify.get('/', (request, reply) => {
  return reply.sendFile('index.html');
});

fastify.get('/status', async (req, rep) => {
  if (TFL_API_KEY === undefined) {
    throw new Error("Missing API key");
  }

  const url = `https://api.tfl.gov.uk/Line/Mode/tube,dlr/Status?app_key=${TFL_API_KEY}`;
  const response = await axios.get(url);
  return response.data;
});

// Run the server!
const start = async () => {
  try {
    await fastify.listen(3000, '0.0.0.0');
  } catch (err) {
    fastify.log.error(err);
    process.exit(1);
  }
}

start();
