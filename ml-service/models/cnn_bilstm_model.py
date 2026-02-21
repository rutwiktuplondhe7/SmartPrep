import torch
import torch.nn as nn

class CNN_BiLSTM(nn.Module):
    def __init__(self, num_classes):
        super(CNN_BiLSTM, self).__init__()

        # CNN
        self.cnn = nn.Sequential(
            nn.Conv2d(1, 32, kernel_size=3, padding=1),
            nn.BatchNorm2d(32),
            nn.ReLU(),
            nn.MaxPool2d((2, 2)),

            nn.Conv2d(32, 64, kernel_size=3, padding=1),
            nn.BatchNorm2d(64),
            nn.ReLU(),
            nn.MaxPool2d((2, 2)),

            nn.Conv2d(64, 128, kernel_size=3, padding=1),
            nn.BatchNorm2d(128),
            nn.ReLU(),
        )

        self.lstm = None  # will initialize dynamically
        self.hidden_size = 128
        self.num_classes = num_classes

        self.fc = None  # will initialize after LSTM

    def forward(self, x):
        # x: (B, 1, 128, T)

        x = self.cnn(x)

        B, C, Freq, T = x.size()

        # reshape for LSTM
        x = x.permute(0, 3, 1, 2)  # (B, T, C, F)
        x = x.contiguous().view(B, T, C * Freq)

        # initialize LSTM dynamically
        if self.lstm is None:
            self.lstm = nn.LSTM(
                input_size=C * Freq,
                hidden_size=self.hidden_size,
                num_layers=1,
                batch_first=True,
                bidirectional=True
            ).to(x.device)

        x, _ = self.lstm(x)

        # mean pool
        x = torch.mean(x, dim=1)

        # initialize FC dynamically
        if self.fc is None:
            self.fc = nn.Linear(self.hidden_size * 2, self.num_classes).to(x.device)

        out = self.fc(x)

        return out