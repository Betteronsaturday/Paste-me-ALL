"use strict";
// code.ts
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
figma.showUI(__html__, { width: 400, height: 280, themeColors: true });
let copiedTexts = [];
let selectionOrderMap = new Map();
let currentOrderCounter = 0;
const MAX_ITEMS = 20;
function getSelectedTextNodes() {
    return figma.currentPage.selection.filter(node => node.type === "TEXT");
}
// Track selection order as user selects items
figma.on("selectionchange", () => {
    const currentSelection = figma.currentPage.selection;
    // Find newly selected items
    currentSelection.forEach(node => {
        if (!selectionOrderMap.has(node.id)) {
            selectionOrderMap.set(node.id, currentOrderCounter++);
        }
    });
    // Remove deselected items from map
    const selectedIds = new Set(currentSelection.map(n => n.id));
    Array.from(selectionOrderMap.keys()).forEach(id => {
        if (!selectedIds.has(id)) {
            selectionOrderMap.delete(id);
        }
    });
});
// Sort nodes by tracked selection order
function sortBySelectionOrder(nodes) {
    return [...nodes].sort((a, b) => {
        var _a, _b;
        const orderA = (_a = selectionOrderMap.get(a.id)) !== null && _a !== void 0 ? _a : Infinity;
        const orderB = (_b = selectionOrderMap.get(b.id)) !== null && _b !== void 0 ? _b : Infinity;
        return orderA - orderB;
    });
}
figma.ui.onmessage = (msg) => __awaiter(void 0, void 0, void 0, function* () {
    if (msg.type === "get-selection-info") {
        const textNodes = getSelectedTextNodes();
        figma.ui.postMessage({
            type: "selection-info",
            count: textNodes.length,
            max: MAX_ITEMS,
            isText: textNodes.length > 0 && textNodes.length <= MAX_ITEMS && textNodes.every(n => n.type === "TEXT"),
        });
    }
    if (msg.type === "copy-texts") {
        const textNodes = getSelectedTextNodes();
        if (textNodes.length < 1) {
            figma.ui.postMessage({ type: "error", message: "Select at least 1 Text element to copy." });
            return;
        }
        if (textNodes.length > MAX_ITEMS) {
            figma.ui.postMessage({ type: "warning", message: `You have selected more than ${MAX_ITEMS} items. Only the first ${MAX_ITEMS} will be copied.` });
            const sortedNodes = sortBySelectionOrder(textNodes);
            const nodesToCopy = sortedNodes.slice(0, MAX_ITEMS);
            copiedTexts = nodesToCopy.map(node => node.characters);
            figma.ui.postMessage({ type: "copied", count: copiedTexts.length });
            return;
        }
        // Sort by tracked selection order
        const sortedNodes = sortBySelectionOrder(textNodes);
        copiedTexts = sortedNodes.map(node => node.characters);
        figma.ui.postMessage({ type: "copied", count: copiedTexts.length });
        // Clear selection order tracking after copy
        selectionOrderMap.clear();
        currentOrderCounter = 0;
    }
    if (msg.type === "paste-texts") {
        const textNodes = getSelectedTextNodes();
        if (copiedTexts.length === 0) {
            figma.ui.postMessage({ type: "error", message: "No texts copied. Please copy first." });
            return;
        }
        if (textNodes.length !== copiedTexts.length) {
            figma.ui.postMessage({ type: "error", message: "Number of selected Text elements does not match copied count." });
            return;
        }
        // Sort destination nodes by their selection order
        const sortedNodes = sortBySelectionOrder(textNodes);
        for (let i = 0; i < sortedNodes.length; i++) {
            try {
                yield figma.loadFontAsync(sortedNodes[i].fontName);
                sortedNodes[i].characters = copiedTexts[i];
            }
            catch (e) {
                figma.ui.postMessage({ type: "error", message: "Failed to paste: " + e });
                return;
            }
        }
        figma.ui.postMessage({ type: "pasted", count: sortedNodes.length });
        // Clear selection order tracking after paste
        selectionOrderMap.clear();
        currentOrderCounter = 0;
    }
    if (msg.type === "close") {
        figma.closePlugin();
    }
});
