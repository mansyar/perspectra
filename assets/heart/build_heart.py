"""Deterministic builder for the Perspectra heart asset.

Run headlessly (from the project root):

    blender --background --python assets/heart/build_heart.py

Outputs:
    assets/heart/heart.glb
    public/assets/heart/heart-poster.png

The six exported mesh object names are the canonical hotspot IDs. Geometry is
synthetic and authored here, so the shipped asset is unencumbered by the
CC BY-SA anatomical references used only for visual study.
"""

from pathlib import Path
import math

import bpy
from mathutils import Vector

ROOT = Path(__file__).resolve().parents[2]
GLB_PATH = ROOT / "assets" / "heart" / "heart.glb"
POSTER_PATH = ROOT / "public" / "assets" / "heart" / "heart-poster.png"

HOTSPOTS = (
    "left_ventricle",
    "right_ventricle",
    "aorta",
    "pulmonary_artery",
    "mitral_valve",
    "aortic_valve",
)


def clear_scene():
    bpy.ops.object.select_all(action="SELECT")
    bpy.ops.object.delete(use_global=False)
    for datablocks in (bpy.data.meshes, bpy.data.curves, bpy.data.materials):
        for block in list(datablocks):
            if block.users == 0:
                datablocks.remove(block)


def material(name, color, roughness=0.45, metallic=0.0):
    mat = bpy.data.materials.new(name)
    mat.diffuse_color = (*color, 1.0)
    mat.use_nodes = True
    bsdf = mat.node_tree.nodes.get("Principled BSDF")
    if bsdf:
        bsdf.inputs["Base Color"].default_value = (*color, 1.0)
        bsdf.inputs["Roughness"].default_value = roughness
        bsdf.inputs["Metallic"].default_value = metallic
    return mat


def assign(obj, mat):
    obj.data.materials.clear()
    obj.data.materials.append(mat)
    return obj


def smooth(obj):
    for poly in obj.data.polygons:
        poly.use_smooth = True
    return obj


def sphere(name, location, scale, mat, segments=20, rings=12):
    bpy.ops.mesh.primitive_uv_sphere_add(
        segments=segments, ring_count=rings, location=location
    )
    obj = bpy.context.object
    obj.name = name
    obj.scale = scale
    bpy.ops.object.transform_apply(location=False, rotation=False, scale=True)
    return smooth(assign(obj, mat))


def tube(name, points, radius, mat, resolution=12):
    curve = bpy.data.curves.new(name + "_curve", type="CURVE")
    curve.dimensions = "3D"
    curve.resolution_u = 16
    curve.bevel_depth = radius
    curve.bevel_resolution = 3
    spline = curve.splines.new("POLY")
    spline.points.add(len(points) - 1)
    for point, coord in zip(spline.points, points):
        point.co = (*coord, 1.0)
    obj = bpy.data.objects.new(name, curve)
    bpy.context.collection.objects.link(obj)
    bpy.ops.object.select_all(action="DESELECT")
    obj.select_set(True)
    bpy.context.view_layer.objects.active = obj
    bpy.ops.object.convert(target="MESH")
    obj = bpy.context.object
    obj.name = name
    obj.data.name = name + "_mesh"
    return smooth(assign(obj, mat))


def ring(name, location, radius, thickness, mat):
    bpy.ops.mesh.primitive_torus_add(
        major_segments=24,
        minor_segments=8,
        location=location,
        major_radius=radius,
        minor_radius=thickness,
    )
    obj = bpy.context.object
    obj.name = name
    return smooth(assign(obj, mat))


def build():
    clear_scene()

    muscle = material("myocardium", (0.62, 0.11, 0.15), roughness=0.5)
    ventricle_r = material("right_ventricle", (0.32, 0.24, 0.48), roughness=0.55)
    arterial = material("artery_oxygenated", (0.78, 0.16, 0.2), roughness=0.4)
    venous = material("artery_deoxygenated", (0.19, 0.42, 0.72), roughness=0.4)
    valve = material("valve_tissue", (0.92, 0.78, 0.58), roughness=0.35)

    objects = []
    objects.append(
        sphere("left_ventricle", (-0.35, 0.0, -0.15), (1.02, 0.78, 1.34), muscle)
    )
    objects.append(
        sphere("right_ventricle", (0.55, 0.16, -0.1), (0.78, 0.64, 1.12), ventricle_r)
    )
    objects.append(
        tube(
            "aorta",
            [
                (-0.2, 0.0, 0.85),
                (-0.25, 0.0, 1.35),
                (-0.05, 0.0, 1.72),
                (0.42, 0.0, 1.86),
                (0.72, 0.0, 1.62),
            ],
            0.23,
            arterial,
        )
    )
    objects.append(
        tube(
            "pulmonary_artery",
            [
                (0.35, 0.1, 0.78),
                (0.55, 0.1, 1.2),
                (0.82, 0.05, 1.45),
                (1.18, -0.05, 1.48),
            ],
            0.19,
            venous,
        )
    )
    objects.append(ring("mitral_valve", (-0.38, 0.02, 0.52), 0.27, 0.055, valve))
    objects.append(ring("aortic_valve", (-0.2, 0.0, 0.86), 0.19, 0.045, valve))

    assert tuple(obj.name for obj in objects) == HOTSPOTS

    bpy.ops.object.select_all(action="DESELECT")
    for obj in objects:
        obj.select_set(True)
    bpy.context.view_layer.objects.active = objects[0]

    GLB_PATH.parent.mkdir(parents=True, exist_ok=True)
    bpy.ops.export_scene.gltf(
        filepath=str(GLB_PATH),
        export_format="GLB",
        use_selection=True,
        export_apply=True,
        export_yup=True,
        export_materials="EXPORT",
        export_cameras=False,
        export_lights=False,
    )

    render_poster(objects)

    return GLB_PATH, POSTER_PATH


def render_poster(objects):
    scene = bpy.context.scene
    scene.render.engine = "BLENDER_WORKBENCH"
    scene.display.shading.light = "STUDIO"
    scene.display.shading.studio_light = "paint.sl"
    scene.display.shading.color_type = "MATERIAL"
    scene.display.shading.show_shadows = True
    scene.render.film_transparent = False
    scene.world.color = (0.04, 0.05, 0.09)
    scene.render.resolution_x = 960
    scene.render.resolution_y = 960
    scene.render.resolution_percentage = 100
    scene.render.image_settings.file_format = "PNG"

    bpy.ops.object.camera_add(location=(4.6, -6.4, 3.2))
    camera = bpy.context.object
    direction = Vector((0.0, 0.0, 0.35)) - camera.location
    camera.rotation_euler = direction.to_track_quat("-Z", "Y").to_euler()
    camera.data.lens = 48
    scene.camera = camera

    POSTER_PATH.parent.mkdir(parents=True, exist_ok=True)
    scene.render.filepath = str(POSTER_PATH)
    bpy.ops.render.render(write_still=True)

    bpy.data.objects.remove(camera, do_unlink=True)


if __name__ == "__main__":
    build()
