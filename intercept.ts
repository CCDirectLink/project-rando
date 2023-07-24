import { EdgeMarker, MapMarker, MapMeta } from './generator.js';

declare const ig: {
    Game: {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        inject: (body: any) => void;
    }
    TeleportPosition: {
        new (marker: string): unknown
    }
};
declare const sc: {
    AreaLoadable: {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        inject: (body: any) => void;
    }
};

export class Intercept {
	private currentMap: MapMeta;
	private currentMarker: MapMarker = {map: '', marker: ''};
	private generatedMaps = new Map<MapMeta, string>();


	constructor(
		private readonly startRoot: MapMarker,
		private readonly maps: Record<number, Record<number, MapMeta>>,
		private readonly backEdges: Record<string, Record<string, EdgeMarker>>,
	) {
		this.currentMarker = maps[0][0].exits[0].name;
		this.currentMap = maps[0][0];
	}

	hook() {
		// eslint-disable-next-line @typescript-eslint/no-this-alias
		const self = this;
		ig.Game.inject({
			teleport(mapName: string, marker: { marker: string; }, hint: unknown, clearCache: boolean, reloadCache: boolean) {
				const target = self.resolveTeleport(mapName, marker?.marker);
				return this.parent(target.map, new ig.TeleportPosition(target.marker), hint, clearCache, reloadCache);
			},

			preloadLevel(mapName: string) {
				return this.parent(mapName);
			},

			loadLevel(levelData: unknown, clearCache: boolean, reloadCache: boolean) {
				return this.parent(levelData, clearCache, reloadCache);
			}
		});

		sc.AreaLoadable.inject({
			init(name: string) {
				this.parent(name);
			},
			loadInternal(name: string) {
				this.parent(name);
			}
		});
	}

	private resolveTeleport(mapName: string, marker?: string): MapMarker {
		if (mapName === this.currentMarker.map) {
			return this.currentMarker;
		}

		const exits = this.currentMap.exits;
		for (const exit of exits) {
			const original = this.backEdges[mapName][marker ?? 'start'].to;
			if (original?.map === exit.name.map && original.marker === exit.name?.marker) {

			}
		}

		return {
			map: mapName,
			marker: marker ?? '',
		};
	}
}