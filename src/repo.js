import prompt from "./utils/prompt";
import {parse} from "url";
import github from "./repos/github";

export default async function(ctx, pkg) {
	let repourl = pkg.repository && pkg.repository.url;

	if (!repourl) repourl = (await prompt([{
		type: "input",
		name: "url",
		message: "What is the git repository URL?"
	}])).url;

	let {host} = parse(repourl);

	switch (host) {
		case "github.com":
			await github(repourl, ctx, pkg);
			break;

		case "gitlab.com":

			break;

		default:
			throw new Error(`Sorry, autorelease does not support the git host '${host}'. Please contribute a plugin to add support!`);
	}

	// let {type} =

	// switch(type) {
	// 	case "github":
	// 		break;
	//
	// 	case "gitlab":
	// 		break;
	// }
}
