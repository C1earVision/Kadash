import pandas as pd
import matplotlib.pyplot as plt
import os

# Data from the SQL query
products = ['AMD Ryzen 5 5600X', 'Gigabyte B650E Aorus Master', 'NVIDIA GeForce RTX 3070']
units_sold = [10, 4, 2]

# Create the bar chart
fig, ax = plt.subplots(figsize=(12, 6))
colors = ['#FF6B6B', '#4ECDC4', '#45B7D1']
bars = ax.bar(products, units_sold, color=colors)

# Customize the plot
ax.set_title('Top 3 Best Selling Products by Units Sold', fontsize=16, fontweight='bold')
ax.set_xlabel('Product Name', fontsize=12)
ax.set_ylabel('Total Units Sold', fontsize=12)
plt.xticks(rotation=15)

# Add value labels on bars
for bar, value in zip(bars, units_sold):
    height = bar.get_height()
    ax.text(bar.get_x() + bar.get_width()/2., height + 0.2,
            str(value), ha='center', va='bottom', fontweight='bold')

ax.grid(axis='y', alpha=0.3)
plt.tight_layout()

# Save the plot to the current working directory
plt.savefig('output.png', dpi=300, bbox_inches='tight')
plt.close()

print("Bar chart created successfully")