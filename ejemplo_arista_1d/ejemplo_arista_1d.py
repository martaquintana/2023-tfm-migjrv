import torch

# Estos serían los controles de los poms que queremos optimizar, en este caso sólo hay 1
pom = torch.tensor([2.0])

# Esta función es la que te calcula los puntos de control de la boundary en función de los poms.
# En este caso es un simple producto para sacar los dos puntos de control, en tu caso será algo
# más complejo, equivalente a lo que tengáis montado en javascript
def compute_boundary_control_points(pom):
    c0 = pom * -0.5
    c1 = pom * 0.5
    return c0, c1

# Éstas son las coordenadas paramétricas de los vértices en base a los puntos de control, que tendrás que calcular en el 2D
# original, y aquí las usamos para calcular las nuevas posiciones 2D cuando se deforman los puntos de control. Yo las defino a mano
# para que encajen más o menos con el dibujo
v0_alpha = 0.25
v1_alpha = 0.5

# Cálculo de los vértices en base a los puntos de control
def compute_vertices(c0, c1, v0_alpha, v1_alpha):
    v0 = c0 * (1 - v0_alpha) + c1 * (v0_alpha)
    v1 = c0 * (1 - v1_alpha) + c1 * (v1_alpha)

    return v0, v1

# Cálculo de la longitud de la arista. En mi caso que es 1d es sacar el valor absoluto de una resta,
# en tu caso serán normas de vectores
def compute_edge_length(v0, v1):
    return (v0 - v1).abs()

# longitud original del edge, hay que sacarlo de la configuración inicial 2D, yo voy a sacarlo con los valores
# iniciales de este mismo script
c0, c1 = compute_boundary_control_points(pom)
v0, v1 = compute_vertices(c0, c1, v0_alpha, v1_alpha)
original_edge_length = compute_edge_length(v0, v1)

# función que mide el strain de la arista, cuánto se ha estirado/comprimido en
# porcentaje (0 = no hay cambio, 1 = 100% de estirado, 0.5 = 50% de compresion, etc)
def compute_strain(edge_length, original_edge_length):
    return edge_length / original_edge_length - 1

# el strain objetivo, que sacamos como el strain que ha sufrido la arista en el 3D al llevarla al nuevo cuerpo
# aquí me invento que el 3D se ha estirado un 100%, y es lo que queremos conseguir con la optimización para el 2D.
target_strain = 1

# Función de coste a optimizar, que es el cuadrado de la diferencia entre el strain actual y el objetivo. En tu caso será
# una suma de los cuadrados de las diferencias de cada arista
def cost_function(strain, target_strain):
    return (strain - target_strain) ** 2

# Vuelvo a definir el pom inicial, pero ahora le digo que quiero que calcule gradientes, para poder hacer la optimización
pom = torch.tensor([2.0], requires_grad=True)

# Se define el optimizador
optimizer = torch.optim.Adam([pom], 1e-2)

# Vamos a hacer 500 pasos de optimización. En el caso real, habría que hacer iteraciones hasta llegar a convergencia, por ejemplo,
# hasta que los poms apenas cambien después de varias iteraciones.
for i in range(500):
    # Se reinician los gradientes
    optimizer.zero_grad()
    # Se calcula la función de coste desde el POM hasta la loss
    c0, c1 = compute_boundary_control_points(pom)
    v0, v1 = compute_vertices(c0, c1, v0_alpha, v1_alpha)
    e_length = compute_edge_length(v0, v1)
    strain = compute_strain(e_length, original_edge_length)
    loss = cost_function(strain, target_strain)

    print(f"Step # {i}, loss: {loss.item()}, pom: {pom.item()}")
    print(f"  c0: {c0.item()}, c1: {c1.item()}")
    print(f"  v0: {v0.item()}, v1: {v1.item()}")
    print(f"  e_l: {e_length.item()}")

    # Se calculan los gradientes y se propagan hacia atrás
    loss.backward()
    # Se da un paso de optimización
    optimizer.step()
