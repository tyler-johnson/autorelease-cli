import {get,set} from "lodash";

export default function addStep(ctx, side, name, step) {
	let val = get(ctx, ["options",side,name]);
	val = val ? [].concat(val, step).filter(Boolean) : step;
	set(ctx, ["options",side,name], val);
}
