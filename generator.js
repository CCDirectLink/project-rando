import { Random } from './random.js';
var Direction;
(function (Direction) {
    Direction["NORTH"] = "NORTH";
    Direction["EAST"] = "EAST";
    Direction["SOUTH"] = "SOUTH";
    Direction["WEST"] = "WEST";
})(Direction || (Direction = {}));
export class Generator {
    constructor(mapData, edges) {
        this.mapData = mapData;
        this.edges = edges;
        this.backEdges = {};
        this.area = {};
        this.openSpots = [{ x: 0, y: 0 }];
        this.openMaps = [];
        this.reusableMaps = [];
    }
    generate() {
        var _a, _b;
        var _c;
        this.extractBackEdges();
        let success = false;
        let maps = {};
        for (let tries = 0; tries < 100 && !success; tries++) {
            this.area = {};
            this.openSpots = [{ x: 0, y: 0 }];
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
                            (_a = maps[_c = original.map]) !== null && _a !== void 0 ? _a : (maps[_c] = {});
                            maps[original.map][original.marker] = (_b = exit.to) !== null && _b !== void 0 ? _b : exit.name;
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
        return { startRoot: this.area[0][0].exits[0].name, maps };
    }
    extractBackEdges() {
        var _a;
        var _b;
        for (const map of Object.keys(this.edges)) {
            for (const marker of Object.keys(this.edges[map].markers)) {
                const data = this.edges[map].markers[marker];
                if (data.to) {
                    (_a = (_b = this.backEdges)[map]) !== null && _a !== void 0 ? _a : (_b[map] = {});
                    this.backEdges[map][marker] = {
                        to: data.to,
                        dir: this.reverseDir(data.dir)
                    };
                }
            }
        }
    }
    reverseDir(dir) {
        switch (dir) {
            case Direction.NORTH: return Direction.SOUTH;
            case Direction.EAST: return Direction.WEST;
            case Direction.SOUTH: return Direction.NORTH;
            case Direction.WEST: return Direction.EAST;
        }
    }
    extractOpenMaps() {
        for (const mapName of Object.keys(this.mapData)) {
            const mapData = this.mapData[mapName];
            for (const connection of mapData.connections) {
                const connMeta = {
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
                        .filter(([, , ...tags]) => tags.length === 0)
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
    buildRoom() {
        var _a, _b, _c, _d, _e;
        var _f, _g;
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
        const mapMeta = {
            name,
            disabledEvents: this.mapData[name].disabledEvents,
            exits: [...conn.to
                    .map(c => { var _a; return (_a = this.backEdges[c.marker.map][c.marker.marker].to) === null || _a === void 0 ? void 0 : _a.marker; })
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
        (_a = (_f = this.area)[_g = position.y]) !== null && _a !== void 0 ? _a : (_f[_g] = {});
        this.area[position.y][position.x] = mapMeta;
        this.connect(mapMeta, Direction.NORTH, (_b = this.area[position.y - 1]) === null || _b === void 0 ? void 0 : _b[position.x], Direction.SOUTH);
        this.connect(mapMeta, Direction.EAST, (_c = this.area[position.y]) === null || _c === void 0 ? void 0 : _c[position.x + 1], Direction.WEST);
        this.connect(mapMeta, Direction.SOUTH, (_d = this.area[position.y + 1]) === null || _d === void 0 ? void 0 : _d[position.x], Direction.NORTH);
        this.connect(mapMeta, Direction.WEST, (_e = this.area[position.y]) === null || _e === void 0 ? void 0 : _e[position.x - 1], Direction.EAST);
        this.mark(conn, Direction.NORTH, { y: position.y - 1, x: position.x });
        this.mark(conn, Direction.EAST, { y: position.y, x: position.x + 1 });
        this.mark(conn, Direction.SOUTH, { y: position.y + 1, x: position.x });
        this.mark(conn, Direction.WEST, { y: position.y, x: position.x - 1 });
        return true;
    }
    connect(a, aDir, b, bDir) {
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
    mark(conn, dir, pos) {
        var _a;
        if (conn.to.some(m => m.dir === dir)) {
            if (!((_a = this.area[pos.y]) === null || _a === void 0 ? void 0 : _a[pos.x])) {
                if (this.openSpots.every(s => s.x !== pos.x || s.y !== pos.y)) {
                    this.openSpots.push(pos);
                }
            }
        }
    }
    findFiting(position) {
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
    roomFits(conn, position) {
        var _a, _b, _c, _d;
        const result = this.roomFitsTo(conn, Direction.NORTH, (_a = this.area[position.y - 1]) === null || _a === void 0 ? void 0 : _a[position.x], Direction.SOUTH)
            && this.roomFitsTo(conn, Direction.EAST, (_b = this.area[position.y]) === null || _b === void 0 ? void 0 : _b[position.x + 1], Direction.WEST)
            && this.roomFitsTo(conn, Direction.SOUTH, (_c = this.area[position.y + 1]) === null || _c === void 0 ? void 0 : _c[position.x], Direction.NORTH)
            && this.roomFitsTo(conn, Direction.WEST, (_d = this.area[position.y]) === null || _d === void 0 ? void 0 : _d[position.x - 1], Direction.EAST);
        return result;
    }
    roomFitsTo(conn, connDir, map, mapDir) {
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
