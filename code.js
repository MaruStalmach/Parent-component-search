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

        const componentInfo = {
          name: mainName,
          id: node.id,
          parentType: (node.parent && node.parent.type) || "unknown"
      };

      allComponents.push(componentInfo);

      const nameLower = node.name.toLowerCase();
      // search only for properly named components
      const include = ["atom", "molecule", "organism", "module"].some(keyword =>
        nameLower.startsWith(keyword) && !nameLower.startsWith(`_${keyword}`)
      );

      if (include && !uniqueComponents.has(node.name)) {
        uniqueComponents.set(node.name, componentInfo);
      }
    }
  });

  const uniqueComponentsList = Array.from(uniqueComponents.values())
    .sort((a, b) => a.name.localeCompare(b.name));

  console.log(`Found:
  - ${allComponents.length} in total
  - ${uniqueComponentsList.length} components`);

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

figma.showUI(__html__, { width: 350, height: 500 });

figma.ui.postMessage({
  type: "components-found",
  data: results
});

figma.ui.onmessage = (message) => {
  if (message.type === "copy-list") {
    const componentNames = results.uniqueComponents.map(c => c.name);
    console.log("Copy component list:");
    console.log(componentNames.join('\n'));
  }
};
