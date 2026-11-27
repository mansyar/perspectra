"""Deterministic detailed Earth-interior cutaway for Perspectra.

Run headlessly from the project root:

    blender --background --python assets/earth-interior/build_earth.py

Outputs:
    assets/earth-interior/earth.glb
    public/assets/earth-interior/earth-poster.png (reproducible WebP source)
    public/assets/earth-interior/earth-poster.webp (delivered fallback)

The six exported mesh object names are the canonical hotspot IDs. Geometry and
materials are original and procedural; no third-party planet texture is used.
"""

from pathlib import Path
import math

import bpy
from mathutils import Vector

ROOT = Path(__file__).resolve().parents[2]
GLB_PATH = ROOT / "assets" / "earth-interior" / "earth.glb"
POSTER_PATH = ROOT / "public" / "assets" / "earth-interior" / "earth-poster.png"
WEBP_PATH = ROOT / "public" / "assets" / "earth-interior" / "earth-poster.webp"

HOTSPOTS = (
    "crust",
    "upper_mantle",
    "lower_mantle",
    "outer_core",
    "inner_core",
    "lithosphere",
)

# glTF-space anchors. Blender Z-up is converted to glTF Y-up on export.
ANCHORS = {
    "crust": (-0.55, 0.88, 0.72),
    "upper_mantle": (0.72, 0.42, 0.62),
    "lower_mantle": (-0.52, -0.42, 0.54),
    "outer_core": (0.16, 0.02, 0.24),
    "inner_core": (0.0, 0.0, 0.14),
    "lithosphere": (-0.82, 0.58, 0.56),
}

PHI_START = math.radians(-35.0)
PHI_END = math.radians(215.0)
THETA_SEGMENTS = 34
PHI_SEGMENTS = 68


def clear_scene():
    bpy.ops.object.select_all(action="SELECT")
    bpy.ops.object.delete(use_global=False)
    for datablocks in (bpy.data.meshes, bpy.data.curves, bpy.data.materials):
        for block in list(datablocks):
            if block.users == 0:
                datablocks.remove(block)


def material(name, color, roughness=0.55, metallic=0.0, emission=0.0):
    mat = bpy.data.materials.new(name)
    mat.diffuse_color = (*color, 1.0)
    mat.use_nodes = True
    bsdf = mat.node_tree.nodes.get("Principled BSDF")
    if bsdf:
        bsdf.inputs["Base Color"].default_value = (*color, 1.0)
        bsdf.inputs["Roughness"].default_value = roughness
        bsdf.inputs["Metallic"].default_value = metallic
        if emission > 0:
            bsdf.inputs["Emission Color"].default_value = (*color, 1.0)
            bsdf.inputs["Emission Strength"].default_value = emission
    return mat


def terrain(theta, phi):
    """Stable multi-scale pseudo-noise used for continents and rock variation."""
    return (
        0.48 * math.sin(phi * 2.7 + math.sin(theta * 3.1))
        + 0.28 * math.sin(phi * 6.1 - theta * 4.3)
        + 0.16 * math.sin(phi * 11.3 + theta * 8.7)
        + 0.08 * math.cos(phi * 19.1 - theta * 13.9)
    )


def surface_field(theta, phi):
    """Broad, smooth continental shapes rather than per-face pixel noise."""
    return (
        0.60 * math.sin(phi * 2.7 + math.sin(theta * 3.1))
        + 0.28 * math.sin(phi * 5.1 - theta * 3.3)
        + 0.12 * math.sin(phi * 8.3 + theta * 6.7)
    )


def crust_radius(theta, phi):
    field = terrain(theta, phi)
    relief = 0.004 + 0.006 * (field + 1.0)
    if field > 0.34:
        relief += 0.012 * math.sin(phi * 31.0 + theta * 27.0) ** 2
    return 1.0 + relief


def anchor_blender(anchor):
    # (x, y, z) glTF -> (x, -z, y) Blender.
    return Vector((anchor[0], -anchor[2], anchor[1]))


def finish_mesh(name, vertices, faces, face_materials, materials, anchor, vertex_colors=None):
    mesh = bpy.data.meshes.new(name + "_mesh")
    mesh.from_pydata(vertices, [], faces)
    mesh.update()
    for mat in materials:
        mesh.materials.append(mat)
    for polygon, material_index in zip(mesh.polygons, face_materials):
        polygon.material_index = material_index
        polygon.use_smooth = True
    if vertex_colors is not None:
        colors = mesh.vertex_colors.new(name="Color")
        for loop in mesh.loops:
            colors.data[loop.index].color = (*vertex_colors[loop.vertex_index], 1.0)

    obj = bpy.data.objects.new(name, mesh)
    bpy.context.collection.objects.link(obj)

    # Keep the planet centred in world space while giving each node a useful,
    # distinct translation for manifest anchoring and focus behaviour.
    offset = anchor_blender(anchor)
    for vertex in mesh.vertices:
        vertex.co -= offset
    obj.location = offset
    return obj


def shell(name, outer_radius, inner_radius, materials, anchor, surface=False, variation=0.0):
    vertices = []
    faces = []
    face_materials = []

    def point(radius, theta, phi):
        if surface and radius == outer_radius:
            radius = crust_radius(theta, phi)
        elif variation and radius == outer_radius:
            radius += variation * terrain(theta, phi)
        return (
            radius * math.sin(theta) * math.cos(phi),
            radius * math.sin(theta) * math.sin(phi),
            radius * math.cos(theta),
        )

    # Outer and inner grids.
    grids = []
    for radius in (outer_radius, inner_radius):
        grid = []
        for theta_index in range(THETA_SEGMENTS + 1):
            theta = 0.001 + (math.pi - 0.002) * theta_index / THETA_SEGMENTS
            row = []
            for phi_index in range(PHI_SEGMENTS + 1):
                phi = PHI_START + (PHI_END - PHI_START) * phi_index / PHI_SEGMENTS
                row.append(len(vertices))
                vertices.append(point(radius, theta, phi))
            grid.append(row)
        grids.append(grid)

    outer_grid, inner_grid = grids
    vertex_colors = None
    if surface:
        vertex_colors = [(1.0, 1.0, 1.0)] * len(vertices)
        ocean_color = (0.028, 0.16, 0.31)
        shelf_color = (0.05, 0.32, 0.44)
        land_color = (0.27, 0.37, 0.17)
        for theta_index in range(THETA_SEGMENTS + 1):
            theta = 0.001 + (math.pi - 0.002) * theta_index / THETA_SEGMENTS
            for phi_index in range(PHI_SEGMENTS + 1):
                phi = PHI_START + (PHI_END - PHI_START) * phi_index / PHI_SEGMENTS
                field = surface_field(theta, phi)
                if field < 0.10:
                    color = ocean_color
                elif field < 0.32:
                    blend = (field - 0.10) / 0.22
                    color = tuple(a + (b - a) * blend for a, b in zip(ocean_color, shelf_color))
                else:
                    blend = min(1.0, (field - 0.32) / 0.25)
                    color = tuple(a + (b - a) * blend for a, b in zip(shelf_color, land_color))
                vertex_colors[outer_grid[theta_index][phi_index]] = color

    for theta_index in range(THETA_SEGMENTS):
        theta = 0.001 + (math.pi - 0.002) * (theta_index + 0.5) / THETA_SEGMENTS
        for phi_index in range(PHI_SEGMENTS):
            phi = PHI_START + (PHI_END - PHI_START) * (phi_index + 0.5) / PHI_SEGMENTS
            a = outer_grid[theta_index][phi_index]
            b = outer_grid[theta_index + 1][phi_index]
            c = outer_grid[theta_index + 1][phi_index + 1]
            d = outer_grid[theta_index][phi_index + 1]
            faces.append((a, b, c, d))
            if surface:
                # Vertex colours provide smooth continents; one shared PBR material
                # keeps the glTF portable and avoids per-face pixel blocks.
                face_materials.append(0)
            elif len(materials) > 1:
                value = terrain(theta * 1.7, phi * 1.3)
                face_materials.append(max(0, min(len(materials) - 1, int((value + 1.0) * 1.4))))
            else:
                face_materials.append(0)

            a = inner_grid[theta_index][phi_index]
            b = inner_grid[theta_index][phi_index + 1]
            c = inner_grid[theta_index + 1][phi_index + 1]
            d = inner_grid[theta_index + 1][phi_index]
            faces.append((a, b, c, d))
            face_materials.append(len(materials) - 1)

    # Cut faces at both sides of the removed front wedge.
    for phi_index in (0, PHI_SEGMENTS):
        phi = PHI_START if phi_index == 0 else PHI_END
        for theta_index in range(THETA_SEGMENTS):
            outer_a = outer_grid[theta_index][phi_index]
            outer_b = outer_grid[theta_index + 1][phi_index]
            inner_a = inner_grid[theta_index][phi_index]
            inner_b = inner_grid[theta_index + 1][phi_index]
            if phi_index == 0:
                faces.append((outer_a, inner_a, inner_b, outer_b))
            else:
                faces.append((outer_a, outer_b, inner_b, inner_a))
            face_materials.append(len(materials) - 1)

    # Close the tiny polar gaps without adding visible geometry.
    for theta_index in (0, THETA_SEGMENTS):
        for phi_index in range(PHI_SEGMENTS):
            outer_a = outer_grid[theta_index][phi_index]
            outer_b = outer_grid[theta_index][phi_index + 1]
            inner_a = inner_grid[theta_index][phi_index]
            inner_b = inner_grid[theta_index][phi_index + 1]
            faces.append((outer_a, outer_b, inner_b, inner_a))
            face_materials.append(len(materials) - 1)

    return finish_mesh(name, vertices, faces, face_materials, materials, anchor, vertex_colors)


def core(name, radius, mat, anchor, segments=40, rings=20):
    bpy.ops.mesh.primitive_uv_sphere_add(segments=segments, ring_count=rings, radius=radius)
    obj = bpy.context.object
    obj.name = name
    obj.data.name = name + "_mesh"
    obj.data.materials.append(mat)
    for polygon in obj.data.polygons:
        polygon.use_smooth = True
    offset = anchor_blender(anchor)
    for vertex in obj.data.vertices:
        vertex.co -= offset
    obj.location = offset
    return obj


def scale_clip(obj, name, peak):
    """One-shot core pulse keyed 1-7-13 at 24 fps (0.5 s total)."""
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
    """One-shot layer drift; shell origins sit at their anchors, not at the planet centre."""
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

    surface = material("earth_surface_vertex_colour", (1.0, 1.0, 1.0), roughness=0.48)
    surface_nodes = surface.node_tree.nodes
    surface_links = surface.node_tree.links
    vertex_colour = surface_nodes.new("ShaderNodeVertexColor")
    vertex_colour.layer_name = "Color"
    surface_links.new(vertex_colour.outputs["Color"], surface_nodes.get("Principled BSDF").inputs["Base Color"])
    rock = material("crust_cross_section", (0.34, 0.20, 0.11), roughness=0.8)

    litho_a = material("lithosphere_rigid", (0.30, 0.25, 0.18), roughness=0.72)
    litho_b = material("lithosphere_band", (0.40, 0.32, 0.21), roughness=0.68)

    upper_a = material("upper_mantle_ochre", (0.58, 0.25, 0.08), roughness=0.66)
    upper_b = material("upper_mantle_copper", (0.72, 0.34, 0.12), roughness=0.62)
    upper_c = material("upper_mantle_shadow", (0.40, 0.16, 0.06), roughness=0.7)

    lower_a = material("lower_mantle_red", (0.55, 0.10, 0.045), roughness=0.62)
    lower_b = material("lower_mantle_orange", (0.72, 0.17, 0.055), roughness=0.6)
    lower_c = material("lower_mantle_deep", (0.36, 0.055, 0.035), roughness=0.68)

    outer_a = material("outer_core_gold", (0.95, 0.42, 0.045), roughness=0.32, metallic=0.22, emission=0.22)
    outer_b = material("outer_core_yellow", (1.0, 0.66, 0.12), roughness=0.28, metallic=0.18, emission=0.30)
    inner = material("inner_core_light", (1.0, 0.86, 0.42), roughness=0.24, metallic=0.12, emission=0.50)

    objects = []
    objects.append(
        shell(
            "crust",
            1.0,
            0.965,
            [surface, rock],
            ANCHORS["crust"],
            surface=True,
        )
    )
    objects.append(
        shell(
            "lithosphere",
            0.965,
            0.935,
            [litho_a, litho_b],
            ANCHORS["lithosphere"],
            variation=0.0015,
        )
    )
    objects.append(
        shell(
            "upper_mantle",
            0.935,
            0.55,
            [upper_a, upper_b, upper_c],
            ANCHORS["upper_mantle"],
            variation=0.003,
        )
    )
    objects.append(
        shell(
            "lower_mantle",
            0.55,
            0.30,
            [lower_a, lower_b, lower_c],
            ANCHORS["lower_mantle"],
            variation=0.002,
        )
    )
    objects.append(
        shell(
            "outer_core",
            0.30,
            0.15,
            [outer_a, outer_b],
            ANCHORS["outer_core"],
            variation=0.001,
        )
    )
    objects.append(core("inner_core", 0.15, inner, ANCHORS["inner_core"]))

    assert tuple(sorted((obj.name for obj in objects), key=HOTSPOTS.index)) == HOTSPOTS

    by_name = {obj.name: obj for obj in objects}
    drift_clip(by_name["crust"], "CrustShift", (0.0, 0.0, 0.006))
    drift_clip(by_name["upper_mantle"], "UpperMantleFlow", (0.0, 0.0, 0.008))
    drift_clip(by_name["lower_mantle"], "LowerMantleFlow", (0.0, 0.0, 0.006))
    drift_clip(by_name["outer_core"], "OuterCoreConvection", (0.0, 0.0, 0.006))
    scale_clip(by_name["inner_core"], "InnerCorePulse", (1.05, 1.05, 1.05))
    drift_clip(by_name["lithosphere"], "LithosphereDrift", (0.0, 0.0, 0.006))

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
        export_vertex_color="ACTIVE",
        export_vertex_color_name="Color",
        export_all_vertex_colors=True,
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
    scene.display.shading.color_type = "VERTEX"
    scene.display.shading.show_shadows = True
    scene.display.shading.show_cavity = True
    scene.display.shading.cavity_type = "BOTH"
    scene.render.film_transparent = False
    if scene.world is None:
        scene.world = bpy.data.worlds.new("Earth Poster World")
    scene.world.color = (0.018, 0.028, 0.055)
    scene.render.resolution_x = 960
    scene.render.resolution_y = 960
    scene.render.resolution_percentage = 100
    scene.render.image_settings.file_format = "PNG"

    # glTF [4.2, 1.6, 3.6] looking at [0, -0.1, 0] -> Blender (4.2, -3.6, 1.6).
    bpy.ops.object.camera_add(location=(4.2, -3.6, 1.6))
    camera = bpy.context.object
    direction = Vector((0.0, 0.0, -0.1)) - camera.location
    camera.rotation_euler = direction.to_track_quat("-Z", "Y").to_euler()
    camera.data.lens = 52.3
    scene.camera = camera

    POSTER_PATH.parent.mkdir(parents=True, exist_ok=True)
    scene.render.filepath = str(POSTER_PATH)
    bpy.ops.render.render(write_still=True)

    poster = bpy.data.images.load(str(POSTER_PATH), check_existing=False)
    try:
        scene.render.image_settings.file_format = "WEBP"
        scene.render.image_settings.quality = 88
        poster.save_render(str(WEBP_PATH), scene=scene)
    finally:
        bpy.data.images.remove(poster)

    bpy.data.objects.remove(camera, do_unlink=True)


if __name__ == "__main__":
    build()
