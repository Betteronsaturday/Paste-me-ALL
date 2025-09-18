// code.ts

figma.showUI(__html__, { width: 320, height: 320 });

let copiedTexts: string[] = [];

const MAX_ITEMS = 20;

function getSelectedTextNodes(): TextNode[] {
  return figma.currentPage.selection.filter(
    node => node.type === "TEXT"
  ) as TextNode[];
}

figma.ui.onmessage = async (msg) => {
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
        await figma.loadFontAsync(textNodes[i].fontName as FontName);
        textNodes[i].characters = copiedTexts[i];
      } catch (e) {
        figma.ui.postMessage({ type: "error", message: "Failed to paste: " + e });
        return;
      }
    }
    figma.ui.postMessage({ type: "pasted", count: textNodes.length });
  }

  if (msg.type === "close") {
    figma.closePlugin();
  }
};
