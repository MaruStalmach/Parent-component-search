function getAllNodes(node, allNodes = []) {
  /**
  fetches all children of a node, returns a list 
  */
  allNodes.push(node);
  if ("children" in node && node.children) {
    for (const child of node.children) {
      getAllNodes(child, allNodes);
    }
  }
  return allNodes;
}

function findAllMainComponents() {
  console.log("Searching for atom / molecule / organism / module...");

  const allNodes = getAllNodes(figma.root);
  const allComponents = [];
  const uniqueComponents = new Map();

  allNodes.forEach(node => {
    if (node.type === "COMPONENT" || node.type === "COMPONENT_SET") {
      let mainName = "";

      // fetch set name for component set
      if (node.type === "COMPONENT_SET") {
        mainName = node.name;
      } 
      // fetch parent component name for singular component
      else if (node.type === "COMPONENT") {
        if (node.parent && node.parent.type === "COMPONENT_SET") {
          mainName = node.parent.name;
        } else {
          mainName = node.name;
        }
      }

      // find the page the component is on
      let currentNode = node;
      while (currentNode && currentNode.type !== "PAGE") {
        currentNode = currentNode.parent;
      }
      const pageName = currentNode ? currentNode.name : "unknown page";
      const pageId = currentNode ? currentNode.id : null;

      const componentInfo = {
        name: mainName,
        id: node.id,
        page: pageName,
        pageId: pageId,
        parentType: (node.parent && node.parent.type) || "unknown"
      };

      allComponents.push(componentInfo);

      const nameLower = mainName.toLowerCase();
      // search only for properly named components
      const include = ["atom", "molecule", "organism", "module"].some(keyword =>
        (nameLower.includes(keyword) || nameLower.includes(`_${keyword}`))
      );

      if (include && !uniqueComponents.has(mainName)) {
        uniqueComponents.set(mainName, componentInfo);
      }
    }
  });

  const uniqueComponentsList = Array.from(uniqueComponents.values())
    .sort((a, b) => a.name.localeCompare(b.name));

  console.log(`Found:
  - ${allComponents.length} in total
  - ${uniqueComponentsList.length}`);

  return {
    allComponents,
    uniqueComponents: uniqueComponentsList,
    stats: {
      total: allComponents.length,
      unique: uniqueComponentsList.length
    }
  };
}

const results = findAllMainComponents();

figma.showUI(__html__, { width: 450, height: 650 });

figma.ui.postMessage({
  type: "components-found",
  data: results
});

figma.ui.onmessage = (message) => {
  if (message.type === "navigate-to-component") {
    const componentId = message.componentId;
    const pageId = message.pageId;

    const page = figma.root.children.find(p => p.id === pageId);
    if (page && page.type === "PAGE") {
      figma.currentPage = page;
      const component = figma.getNodeById(componentId);
      if (component) {
        figma.viewport.scrollAndZoomIntoView([component]);
        figma.currentPage.selection = [component];
      }
    }
  }

  if (message.type === "copy-list") {
    const componentNames = results.uniqueComponents.map(c => c.name);
    console.log("list to copy:");
    console.log(componentNames.join('\n'));
  }
};