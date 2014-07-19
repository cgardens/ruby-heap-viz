function HeapVisualization() {
  //Public graph properties
  this.objData = $R.state();
  this.radius = $R.state(40);
  this.width = $R.state(960);
  this.height = $R.state(640);

  //Connect it up
  var nodeData = $R(HeapVisualization.nodeData, this).bindTo(this.objData);
  var linkData = $R(HeapVisualization.linkData).bindTo(nodeData);
  var variableTable = $R(HeapVisualization.variableTable).bindTo(nodeData);
  var vizData = $R(HeapVisualization.vizData).bindTo(nodeData, linkData, variableTable);

  var svg = $R(HeapVisualization.svg).bindTo(this.width, this.height);

  var linkGroup = $R(HeapVisualization.linkGroup).bindTo(svg);
  var nodeGroup = $R(HeapVisualization.nodeGroup).bindTo(svg);
  var labelGroup = $R(HeapVisualization.labelGroup).bindTo(svg);
  var varLinkGroup = $R(HeapVisualization.varLinkGroup).bindTo(svg);
  var nodeValuesGroup = $R(HeapVisualization.nodeValuesGroup).bindTo(svg);

  var varTable = $R(HeapVisualization.varTable);
  var varTableRows = $R(HeapVisualization.varTableRows).bindTo(varTable, vizData);

  var force = $R(HeapVisualization.force).bindTo(this.width, this.height, this.radius);
  var forceState = $R(HeapVisualization.forceState).bindTo(force, vizData);

  var nodes = $R(HeapVisualization.nodes).bindTo(nodeGroup, vizData, force, this.radius);
  var links = $R(HeapVisualization.links).bindTo(linkGroup, vizData);
  var labels = $R(HeapVisualization.labels).bindTo(labelGroup, vizData);
  var varLinks = $R(HeapVisualization.varLinks).bindTo(varLinkGroup, vizData);
  var nodeValues = $R(HeapVisualization.nodeValues).bindTo(nodeValuesGroup, vizData);

  var nextForceTick = $R(HeapVisualization.nextForceTick).bindTo(force, this.radius, links, nodes, labels, varLinks, nodeValues)
}
HeapVisualization.colors = [
  "#1f77b4", "#ff7f0e", "#2ca02c", "#d62728", "#9467bd",
  "#8c564b", "#e377c2", "#7f7f7f", "#bcbd22", "#17becf",
  "#1f77b4", "#aec7e8", "#ff7f0e", "#ffbb78", "#2ca02c",
  "#98df8a", "#d62728", "#ff9896", "#9467bd", "#c5b0d5",
  "#8c564b", "#c49c94", "#e377c2", "#f7b6d2", "#7f7f7f",
  "#c7c7c7", "#bcbd22", "#dbdb8d", "#17becf", "#9edae5"
];

HeapVisualization.hexifyOid = function (oid) {
  return "0x"+oid.toString(16).substring(7);
}
HeapVisualization.scaleLinkTarget = function (link, r) {
  var dx = link.target.x - link.source.x;
  var dy = link.target.y - link.source.y;
  var l = Math.sqrt(dx * dx + dy * dy)
  dx = (dx / l) * (l - r)
  dy = (dy / l) * (l - r)
  return {x:link.source.x + dx, y:link.source.y + dy};
}
HeapVisualization.idForVarName = function (name) {
  return "var-row-"+name.replace("@","");
}
HeapVisualization.varLinkOrigin = function (name) {
  var bbox = document
    .getElementById(HeapVisualization.idForVarName(name))
    .getBoundingClientRect();
  return {x:bbox.top + (bbox.height/2), y:bbox.right-3}
}
HeapVisualization.objMap = function (objs) {
  var map = {};
  objs.forEach(function (obj) { map[obj.oid] = obj });
  return map;
}
HeapVisualization.variableKeyFnc = function (d) { return d.name }
HeapVisualization.nodeKeyFnc = function (d) { return d.oid }
HeapVisualization.nodeData = function (objData) {
  var oldNodeMap = HeapVisualization.objMap(this.oldNodeDataCache || []);
  var nodes = objData.map(function (obj,i) {
    var updatedNode = oldNodeMap[obj.oid];
    if (updatedNode) {
      ['klass','names','references','value', 'orphan'].forEach(function (attr) {
        updatedNode[attr] = obj[attr]
      })
    } else {
      updatedNode = obj;
      updatedNode.color = HeapVisualization.colors.shift();
    }
    return updatedNode
  });
  this.oldNodeDataCache = nodes;
  return nodes;
}
HeapVisualization.linkData = function (objData) {
  var nodeMap = HeapVisualization.objMap(objData)
  var links = []

  return links.concat.apply(links, objData.map(function (obj) {
    return obj.references.map(function (ref_oid) {
      return {source:nodeMap[ref_oid], target:obj};
    });
  }));
}
HeapVisualization.variableTable = function (objData) {
  var vars = [];
  objData.forEach(function (obj) {
    vars = vars.concat(obj.names.map(function (name) {
      return {name:name, oid:obj.oid, obj:obj};
    }));
  });
  return vars;
}
HeapVisualization.vizData = function (nodeData, linkData, variableTable) {
  return {nodes:nodeData, links:linkData, variables: variableTable};
}
HeapVisualization.svg = function (width, height) {
  var svg = d3.select("body > svg")
    .attr("width", width)
    .attr("height", height);

  //Specific ordering for z-index
  svg.append("g").attr("class", "var-links");
  svg.append("g").attr("class", "links");
  svg.append("g").attr("class", "nodes");
  svg.append("g").attr("class", "labels");
  svg.append("g").attr("class", "node-values");

  svg.append("svg:defs").selectAll("marker")
      .data(["end", "end-diminished"])
    .enter().append("svg:marker")
      .attr("id", String)
      .attr("viewBox", "0 -5 10 10")
      .attr("refX", 10)
      .attr("refY", 0)
      .attr("markerWidth", 6)
      .attr("markerHeight", 6)
      .attr("orient", "auto")
    .append("svg:path")
      .attr("class", function (d) { return "arrow-marker-"+d })
      .attr("d", "M0,-5L10,0L0,5");

  return svg;
}
HeapVisualization.varTable = function () {
  return d3.select("#var-table tbody");
}
HeapVisualization.nodeGroup = function (svg) {
  return svg.select(".nodes");
}
HeapVisualization.linkGroup = function (svg) {
  return svg.select(".links");
}
HeapVisualization.labelGroup = function (svg) {
  return svg.select(".labels");
}
HeapVisualization.varLinkGroup = function (svg) {
  return svg.select(".var-links");
}
HeapVisualization.nodeValuesGroup = function (svg) {
  return svg.select(".node-values");
}
HeapVisualization.force = function (width, height, radius) {
  var force = d3.layout.force()
    .friction(0.5)
    .chargeDistance(500)
    .charge(-1200)
    .linkDistance(200)
    .size([width+100, height-100]);
  return force;
}
HeapVisualization.forceState = function (force, vizData) {
  force
    .nodes(vizData.nodes)
    .links(vizData.links)
    .start();
}
HeapVisualization.nextForceTick = function (force, radius, links, nodes, labels, varLinks, nodeValues) {
  force.on("tick", function() {
    links
      .attr("x1", function(d) { return d.source.x; })
      .attr("y1", function(d) { return d.source.y; })
      .attr("x2", function(d) { return HeapVisualization.scaleLinkTarget(d,radius).x })
      .attr("y2", function(d) { return HeapVisualization.scaleLinkTarget(d,radius).y });

    nodes.attr("cx", function(d) { return d.x; })
      .attr("cy", function(d) { return d.y; });

    labels.attr("x", function(d) { return d.x; })
      .attr("y", function(d) { return d.y; });

    nodeValues.attr("x", function(d) { return d.x+(radius+10); })
      .attr("y", function(d) { return d.y; });

    var diag = d3.svg.diagonal()
      .projection(function (d) {return [d.y, d.x]})
      .source(function (d,i) { return HeapVisualization.varLinkOrigin(d.name) })
      .target(function (d,i) {
        var link = {
          source: HeapVisualization.varLinkOrigin(d.name),
          target: {x:d.obj.y, y:d.obj.x}
        };
        var scaledL = HeapVisualization.scaleLinkTarget(link, radius);
        return {x:scaledL.x, y:scaledL.y}
      })
    varLinks.attr("d", diag);
  });
}
HeapVisualization.nodes = function (nodeGroup, vizData, force, radius) {
  var node = nodeGroup
    .selectAll(".node")
    .data(vizData.nodes, HeapVisualization.nodeKeyFnc);
  node.enter()
    .append("circle")
    .attr("id", function (d) { return "node-"+d.oid })
    .attr("class", "node")
    .on('mouseover', function (d) {
      var nodeSelector = "circle.node:not(#node-"+d.oid+")";
      var varLinkSelector = "path.var-link:not(#var-link-"+d.oid+")";
      var refLinkSelector = "line.link:not(.link-"+d.oid+")";
      var nodeLabelSelector = ".node-label:not(#node-label-"+d.oid+")";
      var nodeValueSelector = "#node-value-"+d.oid;
      d3.selectAll([nodeSelector,varLinkSelector,refLinkSelector].join(',')).classed('diminished', true)
      d3.selectAll(nodeLabelSelector).classed("diminished-text", true)
      d3.selectAll(refLinkSelector).attr("marker-end","url(#end-diminished)")
      d3.selectAll(nodeValueSelector).style('visibility', 'visible')
    })
    .on('mouseout', function (d) {
      d3.selectAll("circle.node,path.var-link,line.link").classed('diminished', false)
      d3.selectAll("line.link").attr("marker-end","url(#end)")
      d3.selectAll(".node-label").classed("diminished-text",false)
      d3.selectAll("#node-value-"+d.oid).style('visibility', 'hidden')
    });
  node
    .attr("r", radius)
    .style("stroke", function (d,i) { return d.orphan ? "#aaa" : d.color })
    .style("stroke-dasharray", function (d,i) { return d.orphan ? "3,3" : "0" })
    .call(force.drag);
  node.exit()
    .each(function (d) { HeapVisualization.colors.push(d.color); console.log(HeapVisualization.colors) }) //reclaim colors
    .remove()
  return node;
}
HeapVisualization.links = function (linkGroup, vizData) {
  var link = linkGroup.selectAll(".link").data(vizData.links);
  link.enter()
    .append("line")
    .attr("class", function (d) { return "link link-"+d.source.oid })
    .attr("marker-end", "url(#end)");
  link.exit()
    .remove()
  return link;
}
HeapVisualization.labels = function (labelGroup, vizData) {
  var label = labelGroup.selectAll("text")
    .data(vizData.nodes, HeapVisualization.nodeKeyFnc)
  label.enter()
    .append("text")
      .attr("id", function (d) { return "node-label-"+d.oid })
      .attr("class", "node-label")
      .attr("text-anchor", "middle")
  label
    .text(function (d) { return d.klass + "#" + HeapVisualization.hexifyOid(d.oid)});
  label.exit()
    .remove();
  return label;
}
HeapVisualization.varLinks = function (varLinkGroup, vizData) {
  var varLinks = varLinkGroup.selectAll("path")
    .data(vizData.variables, HeapVisualization.variableKeyFnc);
  varLinks.enter()
    .append("path")
    .attr("class", "var-link")

  varLinks
    .attr("id", function (d) { return "var-link-"+d.obj.oid })
    .style("stroke", function (d,i) { return d.obj.color })

  varLinks.exit()
    .remove()
  return varLinks;
}
HeapVisualization.varTableRows = function (varTable, vizData) {
  var rows = varTable.selectAll("tr")
    .data(vizData.variables, HeapVisualization.variableKeyFnc);
  rows.enter()
    .append("tr")
      .attr("id", function (d) { return HeapVisualization.idForVarName(d.name) })
  rows.exit().remove()

  var names = rows.selectAll("td.var-name").data(function (d) {
    return [d.name]
  })
  names.enter()
    .append("td").attr("class","var-name")
  names
    .text(String)

  var refs = rows.selectAll("td.var-ref").data(function (d) {
    return [{
      oid: HeapVisualization.hexifyOid(d.oid),
      color: d.obj.color
    }]
  })
  refs.enter()
    .append("td").attr("class","var-ref")
  refs
    .text(function (d) { return d.oid +" |"})
    .style("color", function (d) { return d.color });

  return rows;
}
HeapVisualization.nodeValues = function (nodeValuesGroup, vizData) {
  var nodeValues = nodeValuesGroup.selectAll("path")
    .data(vizData.nodes, HeapVisualization.nodeKeyFnc);
  nodeValues.enter()
    .append("text")
      .attr("id", function (d) { return "node-value-"+d.oid })
      .attr("class", "node-value")

  nodeValues
    .text(function (d) { return d.value })

  nodeValues.exit()
    .remove()
  return nodeValues;
}
