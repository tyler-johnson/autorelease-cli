import inquirer from "inquirer";
import promisify from "es6-promisify";

export default promisify(inquirer.prompt.bind(inquirer), function(ans) {
	this.resolve(ans);
});
