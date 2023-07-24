import { Generator } from './generator.js';
import { Random } from './random.js';

/** @ {any} ig */

export default class ProjectRedo {
	private baseDirectory: string;
	constructor(mod: any) {
		this.baseDirectory = mod.baseDirectory;
	}

	prestart() {
		Random.init(this.baseDirectory);
		const seed = (Math.random() + '').replace('.', '');
		console.log('seed', seed);
		Random.seed(seed);
		this.load();
	}

	async load() {
		const edges = await (await fetch('/' + this.baseDirectory + 'edges.json')).json();
		const response = await fetch('/' + this.baseDirectory + 'map-data.json');
		const data = await response.json();
		const generator = new Generator(data, edges);
		const {startRoot, maps, backEdges} = generator.generate();
		console.log({startRoot, maps});
		(globalThis as any).ig.Game.inject({
			teleport(mapName: string | number, marker: { marker: string | number; }, hint: any, clearCache: any, reloadCache: any) {
				console.log('teleporting', mapName, marker && marker.marker, hint, clearCache, reloadCache);
				if (maps[mapName] && marker && maps[mapName][marker.marker]) {
					const target = maps[mapName][marker.marker];
					console.log('redirected', target.map, target.marker, hint, clearCache, reloadCache);
					// eslint-disable-next-line @typescript-eslint/ban-ts-comment
					//@ts-ignore
					return this.parent(target.map, new (/** @type {any} */globalThis).ig.TeleportPosition(target.marker), hint, clearCache, reloadCache);
				}
				if (backEdges[mapName] && marker && backEdges[mapName][marker.marker] && backEdges[mapName][marker.marker].to) {
					// eslint-disable-next-line @typescript-eslint/no-non-null-assertion
					const target = backEdges[mapName][marker.marker].to!;
					console.log('blocked', target.map, target.marker, hint, clearCache, reloadCache);
					// eslint-disable-next-line @typescript-eslint/ban-ts-comment
					//@ts-ignore
					return this.parent(target.map, new (/** @type {any} */globalThis).ig.TeleportPosition(target.marker), hint, clearCache, reloadCache);
				}
				console.log('routed', startRoot.map, startRoot.marker, hint, clearCache, reloadCache);
				// eslint-disable-next-line @typescript-eslint/ban-ts-comment
				//@ts-ignore
				return this.parent(startRoot.map, new (/** @type {any} */globalThis).ig.TeleportPosition(startRoot.marker), hint, clearCache, reloadCache);
			},

			preloadLevel(mapName: string) {
				return this.parent(mapName);
			},

			loadLevel(levelData: any, clearCache: boolean, reloadCache: boolean) {
				return this.parent(levelData, clearCache, reloadCache);
			}
		});

		(globalThis as any).sc.AreaLoadable.inject({
			init(name: string) {
				this.parent(name);
			},
			loadInternal(name: string) {
				this.parent(name);
			}
		});
	}
}