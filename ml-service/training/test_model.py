import torch
from models.acoustic_encoder import AcousticEncoder

model = AcousticEncoder()
x = torch.randn(4, 1, 128, 157)

out = model(x)
print(out.shape)
