import { rejects } from "assert";
import { FastifyRequest, FastifyReply } from "fastify";
import { PokemonWithStats } from "models/PokemonWithStats";

export async function getPokemonByName(request: FastifyRequest, reply: FastifyReply) {
  let name: string = request.params['name'];

  reply.headers['Accept'] = 'application/json';

  let hostName = 'pokeapi.co';
  let urlApiPokeman = '/api/v2/pokemon';

  let params = {};

  name == null
    ? name.trim() != ''
      ? (params["name"] = name, urlApiPokeman = urlApiPokeman + '/', urlApiPokeman = urlApiPokeman + name)
      : (urlApiPokeman = urlApiPokeman + "?offset=20", urlApiPokeman = urlApiPokeman + "&limit=20")
    : (urlApiPokeman = urlApiPokeman + '/', urlApiPokeman = urlApiPokeman + name, urlApiPokeman = urlApiPokeman + "?offset=20", urlApiPokeman = urlApiPokeman + "&limit=20")

  const https = require('https');
  const keepAliveAgent = new https.Agent({ keepAlive: true });

  const result: any = await new Promise((resolve, reject) => {

    const requestCallback = (result) => {
      let response: any = "";

      result.on('data', (chunk) => {
        response += chunk;
      });

      result.on('close', () => {
        resolve(response);
      });
    };

    const options = { ...reply.headers, host: hostName, port: 443, path: urlApiPokeman, agent: keepAliveAgent };
    const request = https.request(options, requestCallback);

    request.on("error", (err) => {
      console.log("Error: ", err);
      reject(err);
    }).end();

  });

  if (result == null) {
    reply.code(404);
  }

  if (name) {
    await computeResponse(result, reply);
  }

  reply.send(result);

  return reply;
}

const computeResponse = async (response: any, reply: FastifyReply) => {
  const resp = JSON.parse(response) as any;

  let types = resp.types.map(type => type.type.url);

  let pokemonTypes = [];
  let promises = [];

  types.forEach(async (element) => {
    const https = require('https');
    let options = new URL(element);

    promises.push(
      new Promise((resolve, reject) => {

        let request = https.request(options, (response) => {
          response.setEncoding('binary');

          response.on('data', (chunk) => {
            pokemonTypes.push(chunk);
          });

          response.on('close', () => {
            resolve(pokemonTypes);
          });
        })

        request.on("error", (err) => {
          console.log("Error: ", err);
          reject(err);
        }).end();

      }));
  });

  await Promise.all(promises).then(() => {

    if (pokemonTypes == undefined)
      throw pokemonTypes;

    resp.stats.forEach(element => {
      var stats = [];

      pokemonTypes.map(pok =>
        pok.pokemon?.forEach(st =>
          st.pokemon.name.toUpperCase() == element.stat.name
            ? stats.push(element.base_stat)
            : ([])
        )
      );

      if (stats.length != 0) {
        let avg = stats.reduce((a, b) => a + b) / stats.length;
        element.averageStat = avg;
      } else {
        element.averageStat = 0;
      }

    });

  });

}