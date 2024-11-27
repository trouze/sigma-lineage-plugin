import React, { useEffect, useRef } from 'react';
import { client, useConfig, useElementData } from '@sigmacomputing/plugin';
import * as d3 from 'd3';

// Configure Editor Panel
client.config.configureEditorPanel([
  { name: "source", type: "element" },
  { name: "parent", type: "column", source: "source", allowMultiple: false },
  { name: "child", type: "column", source: "source", allowMultiple: false },
]);

const App = () => {
  const config = useConfig();
  const sigmaData = useElementData(config?.source);
  const ref = useRef(null);

  useEffect(() => {
    if (!config || !sigmaData) {
      console.log("Waiting for config and data...");
      return;
    }

    if (!config.parent || !config.child) {
      console.error("Parent or child column not configured. Please set up the plugin configuration.");
      return;
    }

    if (!sigmaData[config.parent] || !sigmaData[config.child]) {
      console.error("Data for parent or child columns is missing. Check your source table.");
      return;
    }

    try {
      // Handle nodes and links
      const nodes = new Set();
      const links = sigmaData[config.child].map((child, i) => {
        const parent = sigmaData[config.parent][i];
        nodes.add(child);
        if (parent !== null) {
          nodes.add(parent);
          return { source: parent, target: child };
        }
        return null; // No link if parent is null
      }).filter(link => link !== null); // Filter out null links

      const graphData = {
        nodes: Array.from(nodes).map((id) => ({ id })),
        links,
      };

      renderLineageGraph(graphData, ref.current);
    } catch (error) {
      console.error("Error rendering graph:", error);
    }
  }, [config, sigmaData]);

  return <div ref={ref} style={{ width: '100%', height: '100%' }} />;
};

const renderLineageGraph = (data, container) => {
  const width = 1000;
  const height = 600;
  const nodeWidth = 200; // Horizontal space between levels
  const nodeHeight = 100; // Vertical spacing between nodes

  // Clear the container
  d3.select(container).selectAll("*").remove();

  // Add SVG with zoom and pan
  const svg = d3
    .select(container)
    .append("svg")
    .attr("width", width)
    .attr("height", height)
    .call(
      d3.zoom().on("zoom", (event) => {
        g.attr("transform", event.transform);
      })
    )
    .append("g");

  const g = svg.append("g");

  // Identify root nodes (nodes without parents)
  const rootNodes = new Set(data.nodes.map((node) => node.id));
  data.links.forEach((link) => rootNodes.delete(link.target));

  // Create a tree layout for each independent root node
  const hierarchyData = Array.from(rootNodes).map((rootId) => {
    return d3
      .hierarchy(
        {
          id: rootId,
          children: buildHierarchy(rootId, data.links),
        },
        (d) => d.children
      )
      .sum(() => 1); // Dummy sum to force layout
  });

  const treeLayout = d3.tree().nodeSize([nodeHeight, nodeWidth]);

  // Pre-calculate node positions
  const layouts = hierarchyData.map((root) => treeLayout(root));

  // Render each tree
  layouts.forEach((root, idx) => {
    const offsetY = idx * (height / layouts.length); // Offset each root vertically

    // Draw links
    g.append("g")
      .attr("class", "links")
      .selectAll("path")
      .data(root.links())
      .enter()
      .append("path")
      .attr("fill", "none")
      .attr("stroke", "#999")
      .attr("stroke-width", 1.5)
      .attr("d", (d) =>
        `M${d.source.y},${d.source.x + offsetY}C${(d.source.y + d.target.y) / 2},${
          d.source.x + offsetY
        } ${(d.source.y + d.target.y) / 2},${d.target.x + offsetY} ${
          d.target.y
        },${d.target.x + offsetY}`
      );

    // Draw nodes
    const nodes = g
      .append("g")
      .attr("class", "nodes")
      .selectAll("g")
      .data(root.descendants())
      .enter()
      .append("g")
      .attr("transform", (d) => `translate(${d.y},${d.x + offsetY})`);

    nodes
      .append("circle")
      .attr("r", 8)
      .attr("fill", "#69b3a2");

    nodes
      .append("text")
      .attr("dx", 0)
      .attr("dy", (d, i) => (i % 2 === 0 ? -15 : 20)) // Alternating text position
      .text((d) => d.data.id)
      .attr("text-anchor", "middle")
      .attr("font-size", "12px")
      .attr("fill", "#333");
  });

  // Recursive helper to build hierarchy
  function buildHierarchy(rootId, links) {
    const children = links
      .filter((link) => link.source === rootId)
      .map((link) => link.target);
    if (children.length === 0) return null;
    return children.map((childId) => ({
      id: childId,
      children: buildHierarchy(childId, links),
    }));
  }
};

export default App;
