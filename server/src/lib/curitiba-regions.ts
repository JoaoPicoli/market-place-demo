// Regional names follow Curitiba's municipal administration; neighborhood slugs cover the current local catalog.
export const CURITIBA_REGIONS = [
  { slug: "bairro-novo", name: "Bairro Novo", neighborhoodSlugs: [] },
  { slug: "boa-vista", name: "Boa Vista", neighborhoodSlugs: ["bacacheri", "boa-vista", "santa-candida", "tingui"] },
  { slug: "boqueirao", name: "Boqueirão", neighborhoodSlugs: ["hauer", "boqueirao", "xaxim"] },
  { slug: "cajuru", name: "Cajuru", neighborhoodSlugs: ["cajuru", "uberaba", "jardim-das-americas", "guabirotuba"] },
  { slug: "cic", name: "CIC", neighborhoodSlugs: [] },
  { slug: "portao", name: "Portão", neighborhoodSlugs: ["agua-verde", "portao", "vila-izabel"] },
  { slug: "matriz", name: "Matriz", neighborhoodSlugs: ["centro", "batel", "reboucas", "cabral", "juveve"] },
  { slug: "pinheirinho", name: "Pinheirinho", neighborhoodSlugs: [] },
  { slug: "santa-felicidade", name: "Santa Felicidade", neighborhoodSlugs: ["santa-felicidade", "sao-braz", "campo-comprido", "mossungue"] },
  { slug: "tatuquara", name: "Tatuquara", neighborhoodSlugs: [] },
] as const;

export function findCuritibaRegion(slug: string) {
  return CURITIBA_REGIONS.find((region) => region.slug === slug);
}
