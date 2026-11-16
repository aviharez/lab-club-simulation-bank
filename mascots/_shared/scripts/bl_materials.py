"""Material + camera helpers (exec after bl_common.py): materials with flat-lit face, standard camera."""
EXPR3 = ["01_neutral", "02_happy", "03_smug", "04_shocked", "05_dizzy", "06_crying", "07_squint"]
if NAME == "lumi": EXPR3 = EXPR3 + ["08_glint"]
POSES3 = {"idle": 1, "happy": 10, "panic": 20}


def load_img(path, name, noncolor=False):
    im = bpy.data.images.get(name)
    if im and bpy.path.abspath(im.filepath) == path: im.reload()
    else:
        if im: bpy.data.images.remove(im)
        im = bpy.data.images.load(path); im.name = name
    if noncolor: im.colorspace_settings.name = 'Non-Color'
    im.use_fake_user = True
    return im


def build_materials():
    mesh = get_mesh(); me = mesh.data
    base = load_img(DIR_TEX + f"{NAME}_base_clean.png", NAME + "_base_clean")
    masks = load_img(DIR_TEX + f"{NAME}_masks.png", NAME + "_masks", True)
    m = bpy.data.materials.get("Toon") or bpy.data.materials.new("Toon"); m.use_nodes = True
    nt = m.node_tree; nt.nodes.clear(); N = nt.nodes.new; L = nt.links.new
    tex = N("ShaderNodeTexImage"); tex.image = base; tex.name = tex.label = "Base Texture"; tex.location = (-1100, 300)
    uv = N("ShaderNodeUVMap"); uv.uv_map = "FaceUV"; uv.location = (-1350, 0)
    dec = N("ShaderNodeTexImage"); dec.name = dec.label = "Face Decal"; dec.extension = 'CLIP'; dec.location = (-1100, 0)
    d0 = bpy.data.images.get("face_01_neutral") or bpy.data.images.get("face_neutral")
    if d0: dec.image = d0
    fmix = N("ShaderNodeMix"); fmix.data_type = 'RGBA'; fmix.name = fmix.label = "Decal Over Base"; fmix.location = (-750, 250)
    mk = N("ShaderNodeTexImage"); mk.image = masks; mk.name = mk.label = "Masks (R face, G skin)"; mk.location = (-1100, -300)
    sep = N("ShaderNodeSeparateColor"); sep.location = (-800, -300)
    fmax = N("ShaderNodeMath"); fmax.operation = 'MAXIMUM'; fmax.name = fmax.label = "Face Flat-Lit Mask"; fmax.location = (-600, -150)
    dif = N("ShaderNodeBsdfDiffuse"); dif.inputs["Color"].default_value = (1, 1, 1, 1); dif.location = (-1100, -650)
    s2r = N("ShaderNodeShaderToRGB"); s2r.location = (-900, -650)
    ramp = N("ShaderNodeValToRGB"); ramp.name = ramp.label = "Toon Step"; ramp.location = (-700, -650)
    cr = ramp.color_ramp; cr.interpolation = 'LINEAR'
    cr.elements[0].position = 0.27; cr.elements[0].color = (0, 0, 0, 1)
    cr.elements[1].position = 0.33; cr.elements[1].color = (1, 1, 1, 1)
    sh = 0.7 ** 2.2
    scol = N("ShaderNodeMix"); scol.data_type = 'RGBA'; scol.name = scol.label = "Shadow Tint (cloth / skin)"; scol.location = (-500, -400)
    scol.inputs["A"].default_value = (sh, sh, sh, 1)
    scol.inputs["B"].default_value = (0.90 ** 2.2, 0.77 ** 2.2, 0.75 ** 2.2, 1)
    lit = N("ShaderNodeMix"); lit.data_type = 'RGBA'; lit.name = lit.label = "Shadow -> Lit"; lit.location = (-300, -450)
    lit.inputs["B"].default_value = (1, 1, 1, 1)
    face = N("ShaderNodeMix"); face.data_type = 'RGBA'; face.name = face.label = "Face = no shadow"; face.location = (-100, -300)
    face.inputs["B"].default_value = (1, 1, 1, 1)
    mul = N("ShaderNodeMix"); mul.data_type = 'RGBA'; mul.blend_type = 'MULTIPLY'; mul.inputs["Factor"].default_value = 1; mul.location = (100, 100)
    em = N("ShaderNodeEmission"); em.location = (300, 100); outn = N("ShaderNodeOutputMaterial"); outn.location = (500, 100)
    L(uv.outputs["UV"], dec.inputs["Vector"])
    L(dec.outputs["Alpha"], fmix.inputs["Factor"]); L(tex.outputs["Color"], fmix.inputs["A"]); L(dec.outputs["Color"], fmix.inputs["B"])
    L(mk.outputs["Color"], sep.inputs["Color"])
    L(sep.outputs["Red"], fmax.inputs[0]); L(dec.outputs["Alpha"], fmax.inputs[1])
    L(dif.outputs["BSDF"], s2r.inputs["Shader"]); L(s2r.outputs["Color"], ramp.inputs["Fac"])
    L(sep.outputs["Green"], scol.inputs["Factor"])
    L(ramp.outputs["Color"], lit.inputs["Factor"]); L(scol.outputs["Result"], lit.inputs["A"])
    L(fmax.outputs[0], face.inputs["Factor"]); L(lit.outputs["Result"], face.inputs["A"])
    L(fmix.outputs["Result"], mul.inputs["A"]); L(face.outputs["Result"], mul.inputs["B"])
    L(mul.outputs["Result"], em.inputs["Color"]); L(em.outputs["Emission"], outn.inputs["Surface"])

    ol = bpy.data.materials.get("Outline") or bpy.data.materials.new("Outline"); ol.use_nodes = True
    nt2 = ol.node_tree; nt2.nodes.clear()
    e2 = nt2.nodes.new("ShaderNodeEmission"); e2.inputs["Color"].default_value = (0.05, 0.03, 0.02, 1)
    o2 = nt2.nodes.new("ShaderNodeOutputMaterial"); nt2.links.new(e2.outputs["Emission"], o2.inputs["Surface"])
    ol.use_backface_culling = True
    old = [x for x in me.materials if x and x.name not in ("Toon", "Outline")]
    me.materials[0] = m
    if len(me.materials) < 2: me.materials.append(ol)
    else: me.materials[1] = ol
    for x in old:
        if x.users == 0: bpy.data.materials.remove(x)
    return m


def std_camera():
    """Same framing for every character: ortho 1.35, feet (z=0) on the same baseline."""
    hy = get_arm().data.bones["Hip"].head_local.y
    col = get_mesh().users_collection[0]
    return make_cam("Cam_Front", (1, 0, 0), 1.35, (0, hy, 0.5), col)
