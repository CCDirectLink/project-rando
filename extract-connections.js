const fs = require('fs');
const path = require('path');


const root = path.resolve('I:\\Programme\\SteamApps\\steamapps\\common\\CrossCode\\assets'); //../../

(async () => {
	// const inverseDirection = {
	// 	"NORTH": "SOUTH",
	// 	"EAST": "WEST",
	// 	"SOUTH": "NORTH",
	// 	"WEST": "EAST",
	// }

	const edges = {};
	await forEachJson(path.join(root, 'data', 'maps'), (name, content) => {
		const map = path.relative(path.join(root, 'data', 'maps'), name).replace('.json', '').replaceAll('/', '.').replaceAll('\\', '.');
		edges[map] ??= {markers: {}, chests: []};
		if ('entities' in content) {
			for (const entity of content.entities) {
				if (entity.type === 'TeleportGround') {
					edges[map].markers[entity.settings.name] = {to: {map: entity.settings.map, marker: entity.settings.marker}, dir: entity.settings.dir};
					console.log(map, entity.settings.name, entity.settings.map, entity.settings.marker);
				} else if (entity.type === 'Chest') {
					const data = { id: entity.settings.mapId, type: entity.settings.chestType };
					edges[map].chests.push(data);
					if (entity.settings.spawnCondition) {
						data.conditions = [{type: 'var', condition: entity.settings.spawnCondition}];
					} 
				}
			}
		}
	});


	await forEachJson(path.join(root, 'extension', 'post-game', 'data', 'maps'), (name, content) => {
		const map = path.relative(path.join(root, 'extension', 'post-game', 'data', 'maps'), name).replace('.json', '').replaceAll('/', '.').replaceAll('\\', '.');
		edges[map] ??= {markers: {}, chests: []};
		if ('entities' in content) {
			for (const entity of content.entities) {
				if (entity.type === 'TeleportGround') {
					edges[map].markers[entity.settings.name] = {to: {map: entity.settings.map, marker: entity.settings.marker}, dir: entity.settings.dir};
					console.log(map, entity.settings.name, entity.settings.map, entity.settings.marker);
				} else if (entity.type === 'Chest') {
					const data = { id: entity.settings.mapId, type: entity.settings.chestType };
					edges[map].chests.push(data);
					if (entity.settings.spawnCondition) {
						data.conditions = [{type: 'var', condition: entity.settings.spawnCondition}];
					} 
				}
			}
		}
	});

	await fs.promises.writeFile('./edges.json', JSON.stringify(edges, undefined, 4));

	async function forEachJson(dir, callback) {
		const names = await fs.promises.readdir(dir);
		await Promise.all(names.map(async (name) => {
			const file = path.join(dir, name);
			const stat = await fs.promises.stat(file);
			if (stat.isDirectory()) {
				await forEachJson(file, callback);
			}
			if (stat.isFile() && name.endsWith('.json')) {
				try {
					const content = await fs.promises.readFile(file, 'utf8');
					await callback(file, JSON.parse(content));
				} catch (err) {
					console.error(err);
				}
			}
		}));
	}
})().catch(err => console.error(err));
