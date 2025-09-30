// Select elements
const searchInput = document.getElementById("search");
const searchBtn = document.getElementById("searchBtn");
const nameEl = document.getElementById("name");
const spriteEl = document.getElementById("sprite");
const typeEl = document.getElementById("type");
const statsEl = document.getElementById("stats");


// Function to fetch and display Pokémon
async function getPokemon() {
  const search = searchInput.value.toLowerCase();
  const url = `https://pokeapi.co/api/v2/pokemon/${search}`;

  try {
    const response = await fetch(url);
    if (!response.ok) throw new Error("Pokémon not found");
    const data = await response.json();

    nameEl.innerText = data.name.toUpperCase();
    spriteEl.src = data.sprites.front_default;

    // Types
    const types = data.types.map(t => t.type.name).join(", ");
    typeEl.innerText = "Type: " + types;

    // Stats
    const stats = data.stats.map(s => `${s.stat.name}: ${s.base_stat}`).join(", ");
    statsEl.innerText = "Stats: " + stats;

  } catch (error) {
    nameEl.innerText = "Not Found";
    spriteEl.src = "";
    typeEl.innerText = "Type: ---";
    statsEl.innerText = "Stats: ---";
  }
}

// Attach event listener to button
searchBtn.addEventListener("click", getPokemon);

async function getEvolutionChain(pokemonName) {
  try {
    // Step 1: Get Pokémon data
    const res = await fetch(`https://pokeapi.co/api/v2/pokemon/${pokemonName.toLowerCase()}`);
    if (!res.ok) throw new Error("Pokémon not found");
    const data = await res.json();

    // Step 2: Get species data
    const speciesRes = await fetch(data.species.url);
    const speciesData = await speciesRes.json();

    // Step 3: Get evolution chain
    const evoRes = await fetch(speciesData.evolution_chain.url);
    const evoData = await evoRes.json();

    // Step 4: Parse evolution chain
    let evolutions = [];
    let evo = evoData.chain;
    evolutions.push(evo.species.name);

    while (evo.evolves_to.length > 0) {
      evo = evo.evolves_to[0];
      evolutions.push(evo.species.name);
    }

    return evolutions; // array of evolution names
  } catch (error) {
    console.error(error);
    return [];
  }
}

const evolutions = await getEvolutionChain(search);
document.getElementById("evolution").innerText = "Evolutions: " + evolutions.join(" → ");
