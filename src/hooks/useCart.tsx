import { createContext, ReactNode, useContext, useState } from 'react';
import { toast } from 'react-toastify';
import { api } from '../services/api';
import { Product, Stock } from '../types';

interface CartProviderProps {
  children: ReactNode;
}

interface UpdateProductAmount {
  productId: number;
  amount: number;
}

interface CartContextData {
  cart: Product[];
  addProduct: (productId: number) => Promise<void>;
  removeProduct: (productId: number) => void;
  updateProductAmount: ({ productId, amount }: UpdateProductAmount) => void;
}

const CartContext = createContext<CartContextData>({} as CartContextData);

export function CartProvider({ children }: CartProviderProps): JSX.Element {
  const [cart, setCart] = useState<Product[]>(() => {
    const storagedCart = localStorage.getItem('@RocketShoes:cart');

    if (storagedCart) {
      return JSON.parse(storagedCart);
    }

    return [];
  });

  const addProduct = async (productId: number) => {
    try {
      const updatedCart = [...cart];

      const productInCart = updatedCart.find(
        cartProduct => cartProduct.id === productId
      );

      const stockResponse = await api.get<Stock>(`/stock/${productId}`);
      const stockAmount = stockResponse.data.amount;
      const amount = productInCart ? productInCart.amount + 1 : 1;

      if (amount > stockAmount) {
        toast.error('Quantidade solicitada fora de estoque');
        return;
      }

      if (productInCart) {
        productInCart.amount = amount;
      } else {
        const productResponse = await api.get<Product>(`/products/${productId}`);
        const product = productResponse.data;

        const newProduct = {
          ...product,
          amount
        }
        updatedCart.push(newProduct);
      }

      setCart(updatedCart);
      localStorage.setItem(
        '@RocketShoes:cart',
        JSON.stringify(updatedCart)
      );

    } catch {
      toast.error('Erro na adição do produto');
    }
  };

  const removeProduct = (productId: number) => {
    try {
      const updatedCart = [...cart];

      const productIndex = updatedCart.findIndex(product => product.id === productId);

      if (productIndex >= 0) {
        updatedCart.splice(productIndex, 1);
        setCart(updatedCart);
        localStorage.setItem(
          '@RocketShoes:cart',
          JSON.stringify(updatedCart)
        );
      } else {
        throw Error();
      }
    } catch {
      toast.error('Erro na remoção do produto');
    }
  };

  const updateProductAmount = async ({
    productId,
    amount,
  }: UpdateProductAmount) => {
    try {
      if (amount <= 0) {
        return;
      }

      const updatedCart = [...cart];
      const responseStock = await api.get<Stock>(`/stock/${productId}`);
      const stockAmount = responseStock.data.amount;

      if (amount > stockAmount) {
        toast.error('Quantidade solicitada fora de estoque');
        return;
      }

      const updatedProducts = updatedCart.map(cartProduct =>
        cartProduct.id === productId
          ? { ...cartProduct, amount }
          : cartProduct
      )

      setCart(updatedProducts);

      localStorage.setItem(
        '@RocketShoes:cart',
        JSON.stringify(updatedProducts)
      );
    } catch {
      toast.error('Erro na alteração de quantidade do produto');
    }
  };

  return (
    <CartContext.Provider
      value={{ cart, addProduct, removeProduct, updateProductAmount }}
    >
      {children}
    </CartContext.Provider>
  );
}

export function useCart(): CartContextData {
  const context = useContext(CartContext);

  return context;
}
