import { getFunctionAddress, getFunctionName, } from "convex/server";
export function safeFunctionName(f) {
    const address = getFunctionAddress(f);
    return (address.name ||
        (address.reference && address.reference.split("/").slice(2).join("/")) ||
        (address.functionHandle &&
            address.functionHandle.slice("function://".length)) ||
        getFunctionName(f));
}
//# sourceMappingURL=safeFunctionName.js.map