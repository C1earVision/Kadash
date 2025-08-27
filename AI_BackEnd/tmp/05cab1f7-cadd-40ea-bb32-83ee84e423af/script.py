import matplotlib.pyplot as plt
import pandas as pd
import seaborn as sns

# Create the sales data
data = {
    'Brand': ['AMD', 'NVIDIA', 'Corsair'],
    'Units Sold': [10, 5, 4]
}

df = pd.DataFrame(data)

# Create the bar chart
plt.figure(figsize=(10, 6))
colors = ['#1f77b4', '#ff7f0e', '#2ca02c']  # Blue, Orange, Green
bars = plt.bar(df['Brand'], df['Units Sold'], color=colors, alpha=0.8)

# Customize the chart
plt.title('Sales by Brand - Units Sold', fontsize=16, fontweight='bold', pad=20)
plt.xlabel('Brand', fontsize=12)
plt.ylabel('Units Sold', fontsize=12)
plt.grid(axis='y', alpha=0.3)

# Add value labels on top of each bar
for bar in bars:
    height = bar.get_height()
    plt.text(bar.get_x() + bar.get_width()/2., height + 0.1,
             f'{int(height)}', ha='center', va='bottom', fontweight='bold')

# Improve layout
plt.tight_layout()

# Save the chart
plt.savefig('output.png', dpi=300, bbox_inches='tight')
plt.close()

print("Chart created successfully!")