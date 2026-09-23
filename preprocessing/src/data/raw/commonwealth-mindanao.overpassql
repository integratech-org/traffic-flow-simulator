[out:json][timeout:25];
(
  way["highway"~"^(primary|tertiary|secondary)$"](around:200,14.721306, 121.052105);
);
out geom;