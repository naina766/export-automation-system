import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import apiService from '../services/api';

const ProductContext = createContext(null);

export const ProductProvider = ({ children }) => {
  const [products, setProducts] = useState([]);
  const [selectedProduct, setSelectedProduct] = useState(null);
  const [activeProduct, setActiveProduct] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const refreshProducts = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const data = await apiService.getProducts();
      if (data && data.products && data.products.length > 0) {
        setProducts(data.products);
        const active = data.active_product || data.products.find(p => p.active) || data.products[0];
        setActiveProduct(active);
        
        // Retain current selectedProduct if it still exists in the catalog, otherwise default to active
        setSelectedProduct(prev => {
          if (prev) {
            const found = data.products.find(p => p.id === prev.id);
            if (found) return found;
          }
          return active;
        });
      }
    } catch (err) {
      console.error('Failed to load product catalog:', err);
      setError('Unable to load product catalog.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    refreshProducts();
  }, [refreshProducts]);

  const activateProduct = async (productId) => {
    try {
      const res = await apiService.activateProduct(productId);
      if (res && res.product) {
        setActiveProduct(res.product);
        setSelectedProduct(res.product);
        await refreshProducts();
        return { success: true, product: res.product };
      }
      return { success: false, error: 'Activation failed' };
    } catch (err) {
      const msg = err.response?.data?.detail || err.message || 'Failed to activate product';
      return { success: false, error: msg };
    }
  };

  const createProduct = async (productData) => {
    try {
      const res = await apiService.createProduct(productData);
      if (res && res.product) {
        await refreshProducts();
        setSelectedProduct(res.product);
        return { success: true, product: res.product };
      }
      return { success: false, error: 'Product creation failed' };
    } catch (err) {
      const msg = err.response?.data?.detail || err.message || 'Failed to create product';
      return { success: false, error: msg };
    }
  };

  const updateProduct = async (productId, updates) => {
    try {
      const res = await apiService.updateProduct(productId, updates);
      if (res && res.product) {
        await refreshProducts();
        if (selectedProduct?.id === productId) {
          setSelectedProduct(res.product);
        }
        return { success: true, product: res.product };
      }
      return { success: false, error: 'Product update failed' };
    } catch (err) {
      const msg = err.response?.data?.detail || err.message || 'Failed to update product';
      return { success: false, error: msg };
    }
  };

  const deleteProduct = async (productId) => {
    try {
      const res = await apiService.deleteProduct(productId);
      if (res && res.success) {
        await refreshProducts();
        return { success: true };
      }
      return { success: false, error: 'Product deletion failed' };
    } catch (err) {
      const msg = err.response?.data?.detail || err.message || 'Failed to delete product';
      return { success: false, error: msg };
    }
  };

  return (
    <ProductContext.Provider
      value={{
        products,
        selectedProduct,
        setSelectedProduct,
        activeProduct,
        loading,
        error,
        refreshProducts,
        activateProduct,
        createProduct,
        updateProduct,
        deleteProduct
      }}
    >
      {children}
    </ProductContext.Provider>
  );
};

export const useProduct = () => {
  const context = useContext(ProductContext);
  if (!context) {
    throw new Error('useProduct must be used within a ProductProvider');
  }
  return context;
};

export default ProductContext;
