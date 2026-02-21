from datasets import RAVDESSDataset
from torch.utils.data import DataLoader

dataset = RAVDESSDataset("datasets/ravdess/raw")

loader = DataLoader(dataset, batch_size=4)

for x, y in loader:
    print(x.shape)
    print(y.shape)
    break
