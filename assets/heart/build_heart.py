"""Deterministic builder for the Perspectra heart asset.

Run headlessly (from the project root):

    blender --background --python assets/heart/build_heart.py

Outputs:
    assets/heart/heart.glb
    public/assets/heart/heart-poster.png (reproducible WebP source)
    public/assets/heart/heart-poster.webp (delivered fallback)

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
WEBP_PATH = ROOT / "public" / "assets" / "heart" / "heart-poster.webp"

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


def sphere(name, location, scale, mat, segments=26, rings=16, taper=0.0):
    bpy.ops.mesh.primitive_uv_sphere_add(
        segments=segments, ring_count=rings, location=location
    )
    obj = bpy.context.object
    obj.name = name
    obj.scale = scale
    bpy.ops.object.transform_apply(location=False, rotation=False, scale=True)
    if taper:
        for vertex in obj.data.vertices:
            apex = max(0.0, -vertex.co.z / scale[2])
            falloff = 1.0 - taper * apex
            vertex.co.x *= falloff
            vertex.co.y *= falloff
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
        major_segments=30,
        minor_segments=10,
        location=location,
        major_radius=radius,
        minor_radius=thickness,
    )
    obj = bpy.context.object
    obj.name = name
    return smooth(assign(obj, mat))


def scale_clip(obj, name, peak):
    """One-shot contraction/expansion keyed 1-7-13 at 24 fps (0.5 s total)."""
    action = bpy.data.actions.new(name)
    obj.animation_data_create()
    obj.animation_data.action = action
    obj.scale = (1.0, 1.0, 1.0)
    obj.keyframe_insert(data_path="scale", frame=1)
    obj.scale = peak
    obj.keyframe_insert(data_path="scale", frame=7)
    obj.scale = (1.0, 1.0, 1.0)
    obj.keyframe_insert(data_path="scale", frame=13)
    return action


def drift_clip(obj, name, delta):
    """One-shot positional pulse for a tube whose geometry is baked at the origin."""
    action = bpy.data.actions.new(name)
    obj.animation_data_create()
    obj.animation_data.action = action
    origin = obj.location.copy()
    obj.keyframe_insert(data_path="location", frame=1)
    obj.location = origin + Vector(delta)
    obj.keyframe_insert(data_path="location", frame=7)
    obj.location = origin
    obj.keyframe_insert(data_path="location", frame=13)
    return action


def build():
    clear_scene()

    muscle = material("myocardium", (0.68, 0.10, 0.14), roughness=0.46)
    ventricle_r = material("right_ventricle", (0.38, 0.30, 0.56), roughness=0.5)
    arterial = material("artery_oxygenated", (0.82, 0.18, 0.20), roughness=0.36)
    venous = material("artery_deoxygenated", (0.22, 0.46, 0.78), roughness=0.36)
    valve = material("valve_tissue", (0.95, 0.82, 0.60), roughness=0.3)

    objects = []
    objects.append(
        sphere(
            "left_ventricle", (-0.35, 0.0, -0.15), (1.02, 0.78, 1.34), muscle, taper=0.16
        )
    )
    objects.append(
        sphere(
            "right_ventricle",
            (0.55, 0.16, -0.1),
            (0.78, 0.64, 1.12),
            ventricle_r,
            taper=0.12,
        )
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
    objects.append(ring("mitral_valve", (-0.38, 0.02, 0.52), 0.30, 0.065, valve))
    objects.append(ring("aortic_valve", (-0.2, 0.0, 0.86), 0.22, 0.055, valve))

    assert tuple(obj.name for obj in objects) == HOTSPOTS

    by_name = {obj.name: obj for obj in objects}
    scale_clip(by_name["left_ventricle"], "LeftVentricleContract", (0.94, 0.94, 0.96))
    scale_clip(by_name["right_ventricle"], "RightVentricleContract", (0.95, 0.95, 0.97))
    drift_clip(by_name["aorta"], "AorticArchPulse", (0.0, 0.0, 0.02))
    drift_clip(by_name["pulmonary_artery"], "PulmonaryFlow", (0.0, 0.0, 0.02))
    scale_clip(by_name["mitral_valve"], "MitralLeaflets", (1.08, 1.08, 1.0))
    scale_clip(by_name["aortic_valve"], "AorticValveLeaflets", (1.08, 1.08, 1.0))

    bpy.context.scene.render.fps = 24
    bpy.context.scene.frame_set(1)

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
        export_animations=True,
        export_animation_mode="ACTIONS",
        export_cameras=False,
        export_lights=False,
    )

    render_poster(objects)

    return GLB_PATH, POSTER_PATH, WEBP_PATH


def render_poster(objects):
    scene = bpy.context.scene
    scene.render.engine = "BLENDER_WORKBENCH"
    scene.display.shading.light = "STUDIO"
    scene.display.shading.studio_light = "paint.sl"
    scene.display.shading.color_type = "MATERIAL"
    scene.display.shading.show_shadows = True
    scene.display.shading.show_cavity = True
    scene.display.shading.cavity_type = "BOTH"
    scene.render.film_transparent = False
    scene.world.color = (0.022, 0.032, 0.06)
    scene.render.resolution_x = 960
    scene.render.resolution_y = 960
    scene.render.resolution_percentage = 100
    scene.render.image_settings.file_format = "PNG"

    # glTF [0, 0.15, 6.9] looking at [0, 0.15, 0] -> Blender (0, -6.9, 0.15).
    bpy.ops.object.camera_add(location=(0.0, -6.9, 0.15))
    camera = bpy.context.object
    direction = Vector((0.0, 0.0, 0.15)) - camera.location
    camera.rotation_euler = direction.to_track_quat("-Z", "Y").to_euler()
    camera.data.lens = 52.3
    scene.camera = camera

    POSTER_PATH.parent.mkdir(parents=True, exist_ok=True)
    scene.render.filepath = str(POSTER_PATH)
    bpy.ops.render.render(write_still=True)

    # Derive the delivered poster natively so regeneration needs no image tool.
    poster = bpy.data.images.load(str(POSTER_PATH), check_existing=False)
    try:
        scene.render.image_settings.file_format = "WEBP"
        scene.render.image_settings.quality = 85
        poster.save_render(str(WEBP_PATH), scene=scene)
    finally:
        bpy.data.images.remove(poster)

    bpy.data.objects.remove(camera, do_unlink=True)


if __name__ == "__main__":
    build()
