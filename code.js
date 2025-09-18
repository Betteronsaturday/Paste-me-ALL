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
figma.showUI(__html__, { width: 320, height: 320 });
let copiedTexts = [];
const MAX_ITEMS = 20;
function getSelectedTextNodes() {
    return figma.currentPage.selection.filter(node => node.type === "TEXT");
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
            copiedTexts = textNodes.slice(0, MAX_ITEMS).map(node => node.characters);
            figma.ui.postMessage({ type: "copied", count: copiedTexts.length });
            return;
        }
        copiedTexts = textNodes.map(node => node.characters);
        figma.ui.postMessage({ type: "copied", count: copiedTexts.length });
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
        for (let i = 0; i < textNodes.length; i++) {
            try {
                yield figma.loadFontAsync(textNodes[i].fontName);
                textNodes[i].characters = copiedTexts[i];
            }
            catch (e) {
                figma.ui.postMessage({ type: "error", message: "Failed to paste: " + e });
                return;
            }
        }
        figma.ui.postMessage({ type: "pasted", count: textNodes.length });
    }
    if (msg.type === "close") {
        figma.closePlugin();
    }
});
