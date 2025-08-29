import pandas as pd
import matplotlib.pyplot as plt

# Data: top 3 selling products and units sold
# Retrieved from database query
products = ['AMD Ryzen 5 5600X', 'Gigabyte B650E Aorus Master', 'NVIDIA GeForce RTX 3070']
units = [10, 4, 2]

# Create DataFrame
import numpy as np

fig, ax = plt.subplots(figsize=(8,6))
ax.bar(products, units, color='skyblue')
ax.set_title('Top 3 Selling Products')
ax.set_xlabel('Product')
ax.set_ylabel('Units Sold')

plt.tight_layout()
plt.savefig(r'output.png')
plt.close()
