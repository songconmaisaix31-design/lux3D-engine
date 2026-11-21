import argparse
from pathlib import Path

import numpy as np
import trimesh


def build_corn():
    rng = np.random.default_rng(20261122)
    positions = np.array([-0.052, -0.044, -0.025, 0.004, 0.025, 0.038, 0.048, 0.052])
    radii = np.array([0.0194, 0.0206, 0.0214, 0.0213, 0.0196, 0.0155, 0.0092, 0.004])

    def radius(x):
        return np.interp(x, positions, radii)

    contour = np.vstack((
        [0.0, positions[0]],
        np.column_stack((radii, positions)),
        [0.0, positions[-1]],
    ))
    core = trimesh.creation.revolve(contour, sections=64)
    core.apply_transform(trimesh.transformations.rotation_matrix(np.pi / 2, [0, 1, 0]))
    core_colors = np.tile([228, 172, 57, 255], (len(core.vertices), 1))
    core_colors[core.vertices[:, 0] <= -0.051] = [244, 210, 139, 255]
    core.visual.vertex_colors = core_colors
    parts = [core]
    grain = trimesh.creation.uv_sphere(count=[9, 13])
    softened_grain = np.sign(grain.vertices) * np.abs(grain.vertices) ** 0.68

    for row in range(15):
        for index in range(20):
            x = -0.047 + 0.0047 * (index + 0.5 * (row % 2)) + rng.uniform(-0.00055, 0.00055)
            if x > 0.047 + rng.uniform(-0.002, 0.0):
                continue
            theta = 2 * np.pi * row / 15 + 1.25 * x + rng.uniform(-0.026, 0.026)
            outward = np.array([0.0, np.cos(theta), np.sin(theta)])
            tangent = np.array([0.0, -np.sin(theta), np.cos(theta)])
            shrink = radius(x) / 0.0214
            widths = np.array([0.00237, 0.00418 * shrink, 0.00362 * np.sqrt(shrink)])
            widths *= rng.uniform(0.88, 1.10, 3)
            # 以正交坐标沿穗轴、圆周切向和表面法向排列每颗籽粒。
            axes = np.stack(([1, 0, 0], -tangent, outward))
            vertices = (softened_grain * widths) @ axes + np.array([x, 0, 0]) + radius(x) * outward
            mesh = trimesh.Trimesh(vertices=vertices, faces=grain.faces, process=False)
            color = np.array([250, 173, 38]) + rng.integers(-15, 16, 3)
            brightness = 0.88 + 0.12 * (softened_grain[:, 2] + 1) / 2
            colors = np.column_stack((np.clip(color * brightness[:, None], 0, 255),
                                      np.full(len(vertices), 255)))
            mesh.visual.vertex_colors = colors.astype(np.uint8)
            parts.append(mesh)

    corn = trimesh.util.concatenate(parts)
    corn.apply_translation(-corn.bounds.mean(axis=0))
    return trimesh.Scene({"sweet-corn": corn})


def apply_material(tree):
    material = {
        "name": "Sweet corn surface",
        "pbrMetallicRoughness": {"metallicFactor": 0.0, "roughnessFactor": 0.64},
    }
    materials = tree.setdefault("materials", [])
    material_index = len(materials)
    materials.append(material)
    for mesh in tree["meshes"]:
        for primitive in mesh["primitives"]:
            primitive["material"] = material_index


if __name__ == "__main__":
    parser = argparse.ArgumentParser()
    parser.add_argument("output", type=Path)
    output = parser.parse_args().output
    model = build_corn()
    output.write_bytes(trimesh.exchange.gltf.export_glb(
        model, include_normals=True, tree_postprocessor=apply_material,
    ))
