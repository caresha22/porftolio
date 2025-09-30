document.addEventListener("DOMContentLoaded", () => {
  const searchInput = document.getElementById("search");
  const searchBtn = document.getElementById("searchBtn");
  const nameEl = document.getElementById("name");
  const spriteEl = document.getElementById("sprite");
  const typeEl = document.getElementById("type");
  const statsEl = document.getElementById("stats");
  const evolutionEl = document.getElementById("evolution");

  searchBtn.addEventListener("click", getPokemon);

  async function getPokemon() {
    const search = searchInput.value.toLowerCase();
    const url = `https://pokeapi.co/api/v2/pokemon/${search}`;

    try {
      const response = await fetch(url);
      if (!response.ok) throw new Error("Pokémon not found");
      const data = await response.json();

      // Main info
      nameEl.innerText = data.name.toUpperCase();
      spriteEl.src = data.sprites.front_default;
      typeEl.innerText = "Type: " + data.types.map(t => t.type.name).join(", ");
      statsEl.innerText = "Stats: " + data.stats.map(s => `${s.stat.name}: ${s.base_stat}`).join(", ");

      // Evolutions
      const evolutions = await getEvolutionChain(data.species.url);
      evolutionEl.innerText = "Evolutions: " + (evolutions.length ? evolutions.join(" → ") : "---");

    } catch (error) {
      console.error(error);
      nameEl.innerText = "Not Found";
      spriteEl.src = "";
      typeEl.innerText = "Type: ---";
      statsEl.innerText = "Stats: ---";
      evolutionEl.innerText = "Evolutions: ---";
    }
  }

  // Get evolution chain
  async function getEvolutionChain(speciesUrl) {
    try {
      const speciesRes = await fetch(speciesUrl);
      const speciesData = await speciesRes.json();

      const evoRes = await fetch(speciesData.evolution_chain.url);
      const evoData = await evoRes.json();

      const evolutions = [];
      let evo = evoData.chain;

      evolutions.push(evo.species.name); // first stage

      // Traverse the chain
      while (evo.evolves_to.length > 0) {
        // Take the first evolution branch (simpler)
        evo = evo.evolves_to[0];
        evolutions.push(evo.species.name);
      }

      return evolutions;
    } catch (error) {
      console.error(error);
      return [];
    }
  }
});
