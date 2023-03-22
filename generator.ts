import { Random } from './random.js';

enum Direction {
	NORTH = 'NORTH',
	EAST = 'EAST',
	SOUTH = 'SOUTH',
	WEST = 'WEST',
}

type MapData = Record<string, MapDataEntry>;

interface MapDataEntry {
	disabledEvents: string[];
	connections: Connection[];
}

interface Connection {
	reusable: boolean;
	markers: string[];
	exits: [map: string, marker: string, ...tags: string[]][]
	chests: (number | Chest)[];
}

interface Chest {
	id: number,
	tags: string[]
}

interface ConnectionId {
	map: string,
	id: number;
}

type Edges = Record<string, EdgesEntry>;

interface EdgesEntry {
	markers: Record<string, EdgeMarker>;
}

interface EdgeMarker {
	to?: MapMarker;
	dir: Direction;
}

interface MapMarker {
	map: string;
	marker: string;
}

interface ConnectionMeta {
	reusable: boolean;
	from: MarkerMeta[];
	to: MarkerMeta[];
	chests: (number | Chest)[];
}

interface MarkerMeta {
	dir: Direction;
	marker: MapMarker;
	tags: string[];
}

interface MapMeta {
	name: string;
	exits: ExitMeta[];
	disabledEvents: string[];
}

interface ExitMeta {
	dir: Direction;
	name: MapMarker;
	to?: MapMarker;
}

interface Vec2 {
	x: number;
	y: number;
}

export class Generator {
	backEdges: Record<string, Record<string, EdgeMarker>> = {};
	area: Record<number, Record<number, MapMeta>> = {};
	openSpots: Vec2[] = [{x: 0, y: 0}];
	openMaps: ConnectionMeta[] = [];
	reusableMaps: ConnectionMeta[] = [];

	constructor(
		private readonly mapData: MapData,
		private readonly edges: Edges,
	) {}

	public generate() {
		this.extractBackEdges();
		
		let success = false;
		let maps: Record<string, Record<string, MapMarker>> = {};
		for (let tries = 0; tries < 100 && !success; tries++) {
			this.area = {};
			this.openSpots = [{x: 0, y: 0}];
			this.openMaps = [];
			this.reusableMaps = [];
			this.extractOpenMaps();
	
			const min = this.openMaps.length - this.reusableMaps.length;
	
			while (this.openSpots.length > 0) {
				this.buildRoom();
			}
	
			maps = {};
			let count = 0;
			for (const y of Object.keys(this.area)) {
				for (const x of Object.keys(this.area[+y])) {
					count++;
					const meta = this.area[+y][+x];
					for (const exit of meta.exits) {
						const original = this.edges[exit.name.map].markers[exit.name.marker].to;
						if (original) {
							maps[original.map] ??= {};
							maps[original.map][original.marker] = exit.to ?? exit.name;
						}
					}
				}
			}
	
			if (count >= min) {
				console.log(this.area);
				console.log(tries);
				success = true;
			}
			tries++;
		}
		return {startRoot: this.area[0][0].exits[0].name, maps};
	}

	private extractBackEdges() {
		for (const map of Object.keys(this.edges)) {
			for (const marker of Object.keys(this.edges[map].markers)) {
				const data = this.edges[map].markers[marker];
				if (data.to) {
					this.backEdges[map] ??= {};
					this.backEdges[map][marker] = {
						to: data.to,
						dir: this.reverseDir(data.dir)
					};
				}
			}
		}
	}

	private reverseDir(dir: Direction) {
		switch (dir) {
		case Direction.NORTH: return Direction.SOUTH;
		case Direction.EAST: return Direction.WEST;
		case Direction.SOUTH: return Direction.NORTH;
		case Direction.WEST: return Direction.EAST;
		}
	}

	private extractOpenMaps() {
		for (const mapName of Object.keys(this.mapData)) {
			const mapData = this.mapData[mapName];
			for (const connection of mapData.connections) {
				const connMeta: ConnectionMeta = {
					reusable: !!connection.reusable,
					chests: connection.chests,
					from: connection.markers.map(marker => ({
						dir: this.edges[mapName].markers[marker].dir,
						marker: {
							map: mapName,
							marker,
						},
						tags: []
					})),
					to: connection.exits
						.filter(([,,...tags]) => tags.length === 0)
						.map(([map, marker, ...tags]) => ({
							dir: this.backEdges[map][marker].dir,
							marker: {
								map,
								marker,
							},
							tags,
						}))
				};

				if (connection.reusable) {
					this.reusableMaps.push(connMeta);
				}
				this.openMaps.push(connMeta);
			}
		}
	}

	private buildRoom(): boolean {
		const position = this.openSpots.pop();
		if (!position) {
			return false;
		}

		const conn = this.findFiting(position);
		if (!conn) {
			return false;
		}

		const name = conn.from[0].marker.map;

		for (let i = 0; i < this.openMaps.length; i++) {
			if (this.openMaps[i].from[0].marker.map === name) {
				this.openMaps.splice(i, 1);
				i--;
			}
		}

		const mapMeta: MapMeta = {
			name,
			disabledEvents: this.mapData[name].disabledEvents,
			exits: [...conn.to
				.map(c => this.backEdges[c.marker.map][c.marker.marker].to?.marker as string)
				.filter((marker, index, array) => !!marker && array.indexOf(marker) === index)
				.map(marker => ({
					dir: this.edges[name].markers[marker].dir,
					name: {
						map: name,
						marker
					},
					to: undefined
				}))
			//TODO: conn.from
			]
		};

		this.area[position.y] ??= {};
		this.area[position.y][position.x] = mapMeta;

		this.connect(mapMeta, Direction.NORTH, this.area[position.y - 1]?.[position.x], Direction.SOUTH);
		this.connect(mapMeta, Direction.EAST, this.area[position.y]?.[position.x + 1], Direction.WEST);
		this.connect(mapMeta, Direction.SOUTH, this.area[position.y + 1]?.[position.x], Direction.NORTH);
		this.connect(mapMeta, Direction.WEST, this.area[position.y]?.[position.x - 1], Direction.EAST);

		this.mark(conn, Direction.NORTH, {y: position.y - 1, x: position.x});
		this.mark(conn, Direction.EAST, {y: position.y, x: position.x + 1});
		this.mark(conn, Direction.SOUTH, {y: position.y + 1, x: position.x});
		this.mark(conn, Direction.WEST, {y: position.y, x: position.x - 1});

		return true;
	}

	private connect(a: MapMeta, aDir: Direction, b?: MapMeta, bDir?: Direction) {
		if (!b || !bDir) {
			return;
		}

		const entrances = b.exits.filter(e => e.dir === bDir && !e.to);

		for (const exit of a.exits) {
			if (exit.dir !== aDir || exit.to) {
				continue;
			}

			const to = entrances.pop();
			if (!to) {
				throw new Error('No exits left to connect');
			}
			exit.to = to.name;
			to.to = exit.name;
		}
	}

	private mark(conn: ConnectionMeta, dir: Direction, pos: Vec2) {
		if (conn.to.some(m => m.dir === dir)) {
			if (!this.area[pos.y]?.[pos.x]) {
				if (this.openSpots.every(s => s.x !== pos.x || s.y !== pos.y)) {
					this.openSpots.push(pos);
				}
			}
		}
	}

	private findFiting(position: Vec2) {
		const fittingOpenNonReusable = this.openMaps.filter(c => !c.reusable && this.roomFits(c, position));
		if (fittingOpenNonReusable.length) {
			return Random.randomMember(fittingOpenNonReusable);
		}
		
		const fittingOpenReusable = this.openMaps.filter(c => c.reusable && this.roomFits(c, position));
		if (fittingOpenReusable.length) {
			return Random.randomMember(fittingOpenReusable);
		}
		
		const fittingReusableOne = this.reusableMaps.filter(c => c.to.length === 1 && this.roomFits(c, position));
		if (fittingReusableOne.length) {
			return Random.randomMember(fittingReusableOne);
		}

		const fittingReusableTwo = this.reusableMaps.filter(c => this.roomFits(c, position));
		if (fittingReusableTwo.length) {
			return Random.randomMember(fittingReusableTwo);
		}
		
		return null;
	}

	private roomFits(conn: ConnectionMeta, position: Vec2): boolean {
		const result = 
			this.roomFitsTo(conn, Direction.NORTH, this.area[position.y - 1]?.[position.x], Direction.SOUTH)
			&& this.roomFitsTo(conn, Direction.EAST, this.area[position.y]?.[position.x + 1], Direction.WEST)
			&& this.roomFitsTo(conn, Direction.SOUTH, this.area[position.y + 1]?.[position.x], Direction.NORTH)
			&& this.roomFitsTo(conn, Direction.WEST, this.area[position.y]?.[position.x - 1], Direction.EAST);
		return result;
	}

	private roomFitsTo(conn: ConnectionMeta, connDir: Direction, map?: MapMeta, mapDir?: Direction) {
		if (!map || !mapDir) {
			return true;
		}

		const connCount = Math.max(
			//TODO: conn.from.filter(c => c.dir === connDir).length,
			conn.to.filter(c => c.dir === connDir).length);
		const mapCount = map.exits.filter(e => e.dir === mapDir && !e.to).length;
		return connCount === mapCount;
		
	}
}