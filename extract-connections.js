const fs = require('fs');
const path = require('path');


const root = path.resolve('I:\\Programme\\SteamApps\\steamapps\\common\\CrossCode\\assets'); //../../

(async () => {
	const edges = {};
	await forEachJson(path.join(root, 'data', 'maps'), (name, content) => {
		if ('entities' in content) {
			for (const entity of content.entities) {
				if (entity.type === 'TeleportGround') {
					const map = path.relative(path.join(root, 'data', 'maps'), name).replace('.json', '').replaceAll('/', '.').replaceAll('\\', '.');
					edges[map] ??= {};
					edges[map][entity.settings.name] = {map: entity.settings.map, marker: entity.settings.marker};
					console.log(map, entity.settings.name, entity.settings.map, entity.settings.marker);
				}
			}
		}
	});


	await forEachJson(path.join(root, 'extension', 'post-game', 'data', 'maps'), (name, content) => {
		if ('entities' in content) {
			for (const entity of content.entities) {
				if (entity.type === 'TeleportGround') {
					const map = path.relative(path.join(root, 'extension', 'post-game', 'data', 'maps'), name).replace('.json', '').replaceAll('/', '.').replaceAll('\\', '.');
					edges[map] ??= {};
					edges[map][entity.settings.name] = {map: entity.settings.map, marker: entity.settings.marker};
					console.log(map, entity.settings.name, entity.settings.map, entity.settings.marker);
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
