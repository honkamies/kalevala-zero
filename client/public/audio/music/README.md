# Custom Background Music & Ambient Loops

This directory holds the background music tracks and atmospheric loops for **Sampo-Zero**.

## Supported Audio Formats
* `.ogg` (Recommended for high compression & fidelity in modern web browsers)
* `.mp3`
* `.wav`

## Standard Track Names (Auto-detected per Biome & Event)

| Filename | Purpose / Trigger |
|---|---|
| `vainola.ogg` | Väinölä Wastes (Boreal forest / living earth exploration) |
| `pohjola.ogg` | Pohjola Expanse (Cryo-vaults & sub-zero fortress) |
| `tuonela.ogg` | Tuonela Underworld (River of Death & Kalman realm) |
| `alinen.ogg` | Alinen Abyss (Molten trenches & deep tectonic forge) |
| `ylinen.ogg` | Ylinen Celestial Forge (Cosmic Sampo & stratosphere) |
| `ilman_luominen.ogg` | Ilman Luominen (Primordial Genesis Void) |
| `void_dimension.ogg` | Void Dimension / Endgame Singularity |
| `collapse.ogg` | Post-Boss World Collapse / Emergency extraction run |
| `title.ogg` | Main Menu / Character Select screen |

## Behavior
* When a track is present, the game automatically plays and loops it seamlessly with smooth fade-in / fade-out transitions between biomes.
* If a track has not been added yet, the engine gracefully remains silent without making any synthetic bleeps or throwing errors.
