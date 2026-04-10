import React, { useState, useEffect, useMemo } from 'react';
import { 
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, 
  PieChart, Pie, Cell, Legend, LineChart, Line 
} from 'recharts';
import { 
  Plus, Minus, AlertCircle, History, LayoutDashboard, Package, 
  TrendingUp, Search, BrainCircuit, Bell, LogOut, LogIn, Download
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  collection, onSnapshot, query, orderBy, addDoc, updateDoc, doc, 
  serverTimestamp, getDocs, writeBatch, limit 
} from 'firebase/firestore';
import { auth, db, googleProvider, handleFirestoreError } from '../firebase';
import { signInWithPopup, signOut, onAuthStateChanged, User } from 'firebase/auth';
import { Product, LedgerEntry, OperationType } from '../types';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { analyzeStock } from '@/src/lib/gemini';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import html2canvas from 'html2canvas';

const COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042', '#8884d8', '#82ca9d'];

const initialProductsCSV = `SKU ID,Nama SKU,Kategori,Ukuran,Harga Jual,Total Masuk Approved,Total Keluar Approved,Stock Sistem,Value Stock (Harga Jual),Reorder Level,Stock Status
VALAM30,VALORD - 5AM 30 ML,Fragrance Citrus,30 ML,"Rp169,000",281,0,281,"Rp47,489,000",100,OK
VALAM5,VALORD - 5AM 5 ML,Fragrance Citrus,5 ML,"Rp49,000",700,0,700,"Rp34,300,000",200,OK
VALIMP50,VALORD - IMPERIUM 50 ML,Fragrance Oud,50 ML,"Rp219,000",157,43,114,"Rp24,966,000",60,OK
VALKING30,VALORD - KINGSMAN 30 ML,Fragrance Masculine Boozy,30 ML,"Rp169,000",984,119,865,"Rp146,185,000",100,OK
VALKING5,VALORD - KINGSMAN 5 ML,Fragrance Masculine Boozy,5 ML,"Rp49,000",453,92,361,"Rp17,689,000",200,OK
VALNOCT30,VALORD - NOCTURNE 30 ML,Fragrance Gourmand Masculine,30 ML,"Rp169,000","1,004",307,697,"Rp117,793,000",100,OK
VALNOCT5,VALORD - NOCTURNE 5 ML,Fragrance Gourmand Masculine,5 ML,"Rp49,000",644,0,644,"Rp31,556,000",200,OK
LEN-COM50,LÉNOTES - COMMA 50 ML,Fragrance Musk,50 ML,"Rp179,000",120,0,120,"Rp21,480,000",20,OK
LEN-LOS50,LÉNOTES - LOSS 50 ML,Fragrance Oriental Leather,50 ML,"Rp169,000",95,0,95,"Rp16,055,000",20,OK
LEN-DEEP50,LÉNOTES - DEEPER 50 ML,Fragrance Earthy,50 ML,"Rp199,000",120,0,120,"Rp23,880,000",20,OK
LEN-FIR50,LÉNOTES - FIRST 50 ML,Fragrance Floral,50 ML,"Rp199,000",120,0,120,"Rp23,880,000",35,OK
LEN-COM10,LÉNOTES - COMMA 10 ML,Fragrance Musk,10 ML,"Rp79,000",12,0,12,"Rp948,000",-,LOW
LEN-LOS10,LÉNOTES - LOSS 10 ML,Fragrance Oriental Leather,10 ML,"Rp79,000",0,0,0,Rp0,-,LOW
LEN-DEEP10,LÉNOTES - DEEPER 10 ML,Fragrance Earthy,10 ML,"Rp79,000",6,0,6,"Rp474,000",-,LOW
LEN-FIR10,LÉNOTES - FIRST 10 ML,Fragrance Floral,10 ML,"Rp79,000",10,0,10,"Rp790,000",-,LOW
VALDECSP2,VALORD - DECANT SPRAY KOSONG 2 ML,Fragrance Tools,2 ML,"Rp1,524","3,040",0,"3,040","Rp4,632,960",-,LOW
VALDECSP3,VALORD - DECANT SPRAY KOSONG 3 ML,Fragrance Tools,3 ML,"Rp1,669","1,150",0,"1,150","Rp1,919,350",-,LOW
VALDECSP5,VALORD - DECANT SPRAY KOSONG 5 ML,Fragrance Tools,5 ML,"Rp1,696","3,000",0,"3,000","Rp5,088,000",-,LOW
VALDECSP7,VALORD - DECANT SPRAY KOSONG 7 ML,Fragrance Tools,7 ML,"Rp1,884","1,150",0,"1,150","Rp2,166,600",-,LOW
VALDECSP10,VALORD - DECANT SPRAY KOSONG 10 ML,Fragrance Tools,10 ML,"Rp1,916","7,000",0,"7,000","Rp13,412,000",-,LOW
VALDECPR2,VALORD - DECANT PRESS KOSONG 2 ML,Fragrance Tools,2 ML,"Rp1,968","2,000",0,"2,000","Rp3,936,000",-,LOW
VALDECLI2,VALORD - DECANT LIDI KOSONG 2 ML,Fragrance Tools,2 ML,Rp407,"2,000",0,"2,000","Rp814,000",-,LOW
VALKP,VALORD - KERTAS PARFUM,Blotter Paper,-,Rp304,"6,000",0,"6,000","Rp1,824,000",10,OK
VALPB,VALORD - PAPER BAG,Packaging,-,,0,0,0,Rp0,20,LOW`;

const initialStockInCSV = `ID,Tanggal Masuk,SKU ID,Nama SKU,Qty,Harga Modal,Value,Supplier,Input By,Approval Status,Approved By,Approval Date,Catatan / Edit Request
IN-0001,27-Dec-2025,VALIMP50,VALORD - IMPERIUM 50 ML,157,"Rp41,000","Rp6,437,000",PT Baja Prima,Tiara,Approved,Tiara,8-Apr-2026,Stok awal
IN-0002,27-Dec-2025,VALKING30,VALORD - KINGSMAN 30 ML,199,"Rp31,000","Rp6,169,000",CV Rasa Nusantara,Tiara,Approved,Tiara,9-Apr-2026,Stok awal
IN-0003,19-Dec-2025,VALDECSP10,VALORD - DECANT SPRAY KOSONG 10 ML,"1,000","Rp1,337","Rp1,337,000",Decant Bottle,Tiara,Approved,Tiara,10-Apr-2026,Purchase 1
IN-0004,19-Dec-2025,VALDECSP2,VALORD - DECANT SPRAY KOSONG 2 ML,"1,040","Rp1,043","Rp1,084,720",ParfuMiniKu,Tiara,Approved,Tiara,11-Apr-2026,Purchase 1
IN-0005,19-Dec-2025,VALDECSP5,VALORD - DECANT SPRAY KOSONG 5 ML,"1,000","Rp1,119","Rp1,119,000",ParfuMiniKu,Tiara,Approved,Tiara,12-Apr-2026,Purchase 1
IN-0006,22-Dec-2025,VALDECSP3,VALORD - DECANT SPRAY KOSONG 3 ML,150,"Rp1,152","Rp172,800",ParfuMiniKu,Tiara,Approved,Tiara,13-Apr-2026,Purchase 1
IN-0007,22-Dec-2025,VALDECSP7,VALORD - DECANT SPRAY KOSONG 7 ML,150,"Rp1,254","Rp188,100",ParfuMiniKu,Tiara,Approved,Tiara,14-Apr-2026,Purchase 1
IN-0008,5-Jan-2026,VALKP,VALORD - KERTAS PARFUM,"1,000",Rp218,"Rp218,000",MMJ-Star,Tiara,Approved,Tiara,15-Apr-2026,Purchase 1
IN-0009,26-Jan-2026,VALDECLI2,VALORD - DECANT LIDI KOSONG 2 ML,"2,000",Rp295,"Rp590,000",AceCity,Tiara,Approved,Tiara,16-Apr-2026,Purchase 1
IN-0010,28-Dec-2025,VALDECSP10,VALORD - DECANT SPRAY KOSONG 10 ML,"2,000","Rp1,337","Rp2,674,000",Tata Utama,Tiara,Approved,Tiara,17-Apr-2026,Repurchase 2
IN-0011,28-Dec-2025,VALDECPR2,VALORD - DECANT PRESS KOSONG 2 ML,"2,000","Rp1,376","Rp2,752,000",Decant Bottle,Tiara,Approved,Tiara,18-Apr-2026,Purchase 1
IN-0012,28-Dec-2025,VALDECSP3,VALORD - DECANT SPRAY KOSONG 3 ML,"1,000","Rp1,152","Rp1,152,000",Decant Bottle,Tiara,Approved,Tiara,19-Apr-2026,Repurchase 2
IN-0013,28-Dec-2025,VALDECSP5,VALORD - DECANT SPRAY KOSONG 5 ML,"2,000","Rp1,119","Rp2,238,000",ParfuMiniKu,Tiara,Approved,Tiara,20-Apr-2026,Repurchase 2
IN-0014,28-Dec-2025,VALDECSP7,VALORD - DECANT SPRAY KOSONG 7 ML,"1,000","Rp1,254","Rp1,254,000",ParfuMiniKu,Tiara,Approved,Tiara,21-Apr-2026,Repurchase 2
IN-0015,26-Jan-2026,VALDECSP2,VALORD - DECANT SPRAY KOSONG 2 ML,"2,000","Rp1,043","Rp2,086,000",ParfuMiniKu,Tiara,Approved,Tiara,22-Apr-2026,Repurchase 2
IN-0016,26-Jan-2026,VALKP,VALORD - KERTAS PARFUM,"5,000",Rp218,"Rp1,090,000",ID-VIXEN,Tiara,Approved,Tiara,23-Apr-2026,Repurchase 2
IN-0017,26-Jan-2026,VALDECSP10,VALORD - DECANT SPRAY KOSONG 10 ML,"2,000","Rp1,337","Rp2,674,000",ParfuMiniKu,Tiara,Approved,Tiara,24-Apr-2026,Repurchase 4
IN-0018,5-Jan-2026,VALDECSP10,VALORD - DECANT SPRAY KOSONG 10 ML,"2,000","Rp1,337","Rp2,674,000",Tata Utama,Tiara,Approved,Tiara,25-Apr-2026,Repurchase 3
IN-0019,27-Jan-2026,VALNOCT30,VALORD - NOCTURNE 30 ML,300,"Rp31,000","Rp9,300,000",,Tiara,Approved,Tiara,26-Apr-2026,
IN-0020,5-Feb-2026,VALAM30,VALORD - 5AM 30 ML,281,"Rp31,000","Rp8,711,000",,Tiara,Approved,Tiara,27-Apr-2026,
IN-0021,25-Feb-2026,VALKING5,VALORD - KINGSMAN 5 ML,200,"Rp8,543","Rp1,708,600",,Tiara,Approved,Tiara,28-Apr-2026,
IN-0022,25-Feb-2026,VALNOCT5,VALORD - NOCTURNE 5 ML,200,"Rp8,603","Rp1,720,600",,Tiara,Approved,Tiara,29-Apr-2026,
IN-0023,25-Feb-2026,VALAM5,VALORD - 5AM 5 ML,700,"Rp8,539","Rp5,977,300",,Tiara,Approved,Tiara,30-Apr-2026,
IN-0024,25-Feb-2026,VALNOCT30,VALORD - NOCTURNE 30 ML,704,"Rp31,000","Rp21,824,000",,Tiara,Approved,Tiara,1-May-2026,
IN-0025,27-Mar-2026,VALNOCT5,VALORD - NOCTURNE 5 ML,444,"Rp8,603","Rp3,819,732",,Tiara,Approved,Tiara,2-May-2026,
IN-0026,27-Mar-2026,VALKING30,VALORD - KINGSMAN 30 ML,785,"Rp31,000","Rp24,335,000",,Tiara,Approved,Tiara,3-May-2026,
IN-0027,27-Mar-2026,VALKING5,VALORD - KINGSMAN 5 ML,253,"Rp8,543","Rp2,161,379",,Tiara,Approved,Tiara,4-May-2026,
IN-0028,4-Feb-2026,LEN-FIR50,LÉNOTES - FIRST 50 ML,30,"Rp119,400","Rp3,582,000",Lenotes,Tiara,Approved,Tiara,5-May-2026,
IN-0029,4-Feb-2026,LEN-COM50,LÉNOTES - COMMA 50 ML,30,"Rp107,400","Rp3,222,000",Lenotes,Tiara,Approved,Tiara,6-May-2026,
IN-0030,4-Feb-2026,LEN-DEEP50,LÉNOTES - DEEPER 50 ML,30,"Rp119,400","Rp3,582,000",Lenotes,Tiara,Approved,Tiara,7-May-2026,
IN-0031,4-Feb-2026,LEN-LOS50,LÉNOTES - LOSS 50 ML,30,"Rp101,400","Rp3,042,000",Lenotes,Tiara,Approved,Tiara,8-May-2026,
IN-0032,5-Feb-2026,LEN-FIR10,LÉNOTES - FIRST 10 ML,10,"Rp47,400","Rp474,000",Lenotes,Tiara,Approved,Tiara,9-May-2026,
IN-0033,5-Feb-2026,LEN-COM10,LÉNOTES - COMMA 10 ML,12,"Rp47,400","Rp568,800",Lenotes,Tiara,Approved,Tiara,10-May-2026,
IN-0034,5-Feb-2026,LEN-DEEP10,LÉNOTES - DEEPER 10 ML,6,"Rp47,400","Rp284,400",Lenotes,Tiara,Approved,Tiara,11-May-2026,
IN-0035,20-Feb-2026,LEN-FIR50,LÉNOTES - FIRST 50 ML,60,"Rp119,400","Rp7,164,000",Lenotes,Tiara,Approved,Tiara,12-May-2026,
IN-0036,20-Apr-2026,LEN-COM50,LÉNOTES - COMMA 50 ML,60,"Rp107,400","Rp6,444,000",Lenotes,Tiara,Approved,Tiara,13-May-2026,
IN-0037,20-Apr-2026,LEN-DEEP50,LÉNOTES - DEEPER 50 ML,60,"Rp119,400","Rp7,164,000",Lenotes,Tiara,Approved,Tiara,14-May-2026,
IN-0038,20-Apr-2026,LEN-LOS50,LÉNOTES - LOSS 50 ML,60,"Rp101,400","Rp6,084,000",Lenotes,Tiara,Approved,Tiara,15-May-2026,
IN-0039,3-Mar-2026,LEN-FIR50,LÉNOTES - FIRST 50 ML,30,"Rp119,400","Rp3,582,000",Lenotes,Tiara,Approved,Tiara,16-May-2026,
IN-0040,3-Mar-2026,LEN-COM50,LÉNOTES - COMMA 50 ML,30,"Rp107,400","Rp3,222,000",Lenotes,Tiara,Approved,Tiara,17-May-2026,
IN-0041,3-Mar-2026,LEN-DEEP50,LÉNOTES - DEEPER 50 ML,30,"Rp119,400","Rp3,582,000",Lenotes,Tiara,Approved,Tiara,18-May-2026,
IN-0042,3-Mar-2026,LEN-LOS50,LÉNOTES - LOSS 50 ML,5,"Rp101,400","Rp507,000",Lenotes,Tiara,Approved,Tiara,19-May-2026,`;

const initialStockOutCSV = `ID,Tanggal Keluar,SKU ID,Nama SKU,Qty,Harga Jual,Value,Channel,Input By,Approval Status,Approved By,Approval Date,Catatan / Edit Request
OUT-0001,,VALIMP50,VALORD - IMPERIUM 50 ML,6,"Rp219,000","Rp1,314,000",Offline Store,Tiara,Approved,Tiara,,
OUT-0002,,VALIMP50,VALORD - IMPERIUM 50 ML,1,"Rp219,000","Rp219,000",FO,Tiara,Approved,Tiara,,
OUT-0003,,VALIMP50,VALORD - IMPERIUM 50 ML,11,"Rp219,000","Rp2,409,000",Offline Store,Tiara,Approved,Tiara,,
OUT-0004,27-Feb-2026,VALIMP50,VALORD - IMPERIUM 50 ML,25,"Rp219,000","Rp5,475,000",Event,Tiara,Approved,Tiara,,Event Jagat Aroma
OUT-0005,,VALKING30,VALORD - KINGSMAN 30 ML,20,"Rp169,000","Rp3,380,000",Offline Store,Tiara,Approved,Tiara,,
OUT-0006,,VALKING30,VALORD - KINGSMAN 30 ML,2,"Rp169,000","Rp338,000",Influencer,Tiara,Approved,Tiara,,
OUT-0007,27-Feb-2026,VALKING30,VALORD - KINGSMAN 30 ML,34,"Rp169,000","Rp5,746,000",Event,Tiara,Approved,Tiara,,Event Jagat Aroma
OUT-0008,,VALKING30,VALORD - KINGSMAN 30 ML,60,"Rp169,000","Rp10,140,000",Offline Store,Tiara,Approved,Tiara,,
OUT-0009,31-Mar-2026,VALKING30,VALORD - KINGSMAN 30 ML,3,"Rp169,000","Rp507,000",Mitra,Tiara,Approved,Tiara,,Parcel Mitra
OUT-0010,27-Feb-2026,VALKING5,VALORD - KINGSMAN 5 ML,53,"Rp49,000","Rp2,597,000",Event,Tiara,Approved,Tiara,,Event Jagat Aroma 
OUT-0011,11-Mar-2026,VALKING5,VALORD - KINGSMAN 5 ML,36,"Rp49,000","Rp1,764,000",Mitra,Tiara,Approved,Tiara,,Parcel Lebaran
OUT-0012,31-Mar-2026,VALKING5,VALORD - KINGSMAN 5 ML,3,"Rp49,000","Rp147,000",Mitra,Tiara,Approved,Tiara,,Parcel Mitra
OUT-0013,27-Jan-2026,VALNOCT30,VALORD - NOCTURNE 30 ML,2,"Rp169,000","Rp338,000",Sampel,Tiara,Approved,Tiara,,Sampel Pak Harris dan konten kreator
OUT-0014,29-Jan-2026,VALNOCT30,VALORD - NOCTURNE 30 ML,60,"Rp169,000","Rp10,140,000",Offline Store,Tiara,Approved,Tiara,,
OUT-0015,29-Jan-2026,VALNOCT30,VALORD - NOCTURNE 30 ML,80,"Rp169,000","Rp13,520,000",Offline Store,Tiara,Approved,Tiara,,
OUT-0016,30-Jan-2026,VALNOCT30,VALORD - NOCTURNE 30 ML,2,"Rp169,000","Rp338,000",Mitra,Tiara,Approved,Tiara,,
OUT-0017,,VALNOCT30,VALORD - NOCTURNE 30 ML,3,"Rp169,000","Rp507,000",Influencer,Tiara,Approved,Tiara,,
OUT-0018,,VALNOCT30,VALORD - NOCTURNE 30 ML,11,"Rp169,000","Rp1,859,000",Offline Store,Tiara,Approved,Tiara,,
OUT-0019,14-Feb-2026,VALNOCT30,VALORD - NOCTURNE 30 ML,50,"Rp169,000","Rp8,450,000",Event,Tiara,Approved,Tiara,,Event chindo swipe
OUT-0020,16-Feb-2026,VALNOCT30,VALORD - NOCTURNE 30 ML,1,"Rp169,000","Rp169,000",Mitra,Tiara,Approved,Tiara,,Untuk tamu Pak Harris
OUT-0021,,VALNOCT30,VALORD - NOCTURNE 30 ML,10,"Rp169,000","Rp1,690,000",Influencer,Tiara,Approved,Tiara,,
OUT-0022,27-Feb-2026,VALNOCT30,VALORD - NOCTURNE 30 ML,52,"Rp169,000","Rp8,788,000",Event,Tiara,Approved,Tiara,,Event Jagat Aroma
OUT-0023,11-Mar-2026,VALNOCT30,VALORD - NOCTURNE 30 ML,33,"Rp169,000","Rp5,577,000",Mitra,Tiara,Approved,Tiara,,Parcel Lebaran
OUT-0024,31-Mar-2026,VALNOCT30,VALORD - NOCTURNE 30 ML,3,"Rp169,000","Rp507,000",Mitra,Tiara,Approved,Tiara,,Parcel Mitra`;

export default function InventoryDashboard() {
  const [user, setUser] = useState<User | null>(null);
  const [products, setProducts] = useState<Product[]>([]);
  const [ledger, setLedger] = useState<LedgerEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [aiAnalysis, setAiAnalysis] = useState<string | null>(null);
  const [analyzing, setAnalyzing] = useState(false);
  const [isAuthReady, setIsAuthReady] = useState(false);
  const [ledgerLimit, setLedgerLimit] = useState(50);

  // Auth Listener
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (u) => {
      setUser(u);
      setIsAuthReady(true);
      setLoading(false);
    });
    return () => unsubscribe();
  }, []);

  // Data Listeners
  useEffect(() => {
    if (!user || !isAuthReady) return;

    const productsQuery = query(collection(db, 'products'), orderBy('name'));
    const unsubscribeProducts = onSnapshot(productsQuery, (snapshot) => {
      const prods = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Product));
      setProducts(prods);
      
      // Seed if empty
      if (prods.length === 0) {
        seedInitialData();
      }
    }, (err) => handleFirestoreError(err, OperationType.LIST, 'products'));

    const ledgerQuery = query(collection(db, 'ledger'), orderBy('timestamp', 'desc'), limit(ledgerLimit));
    const unsubscribeLedger = onSnapshot(ledgerQuery, (snapshot) => {
      const entries = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as LedgerEntry));
      setLedger(entries);
    }, (err) => handleFirestoreError(err, OperationType.LIST, 'ledger'));

    return () => {
      unsubscribeProducts();
      unsubscribeLedger();
    };
  }, [user, isAuthReady]);

  const seedInitialData = async () => {
    try {
      const batch = writeBatch(db);
      
      const parseCSVLine = (line: string) => {
        const result = [];
        let current = '';
        let inQuotes = false;
        for (let i = 0; i < line.length; i++) {
          const char = line[i];
          if (char === '"') inQuotes = !inQuotes;
          else if (char === ',' && !inQuotes) {
            result.push(current);
            current = '';
          } else current += char;
        }
        result.push(current);
        return result;
      };

      const cleanNum = (str: string) => {
        if (!str || str === '-') return 0;
        return parseFloat(str.replace(/[^0-9.-]+/g, ""));
      };

      const parseDate = (dateStr: string) => {
        if (!dateStr) return new Date();
        const months: Record<string, number> = {
          'Jan': 0, 'Feb': 1, 'Mar': 2, 'Apr': 3, 'May': 4, 'Jun': 5,
          'Jul': 6, 'Aug': 7, 'Sep': 8, 'Oct': 9, 'Nov': 10, 'Dec': 11
        };
        const parts = dateStr.split('-');
        if (parts.length !== 3) return new Date();
        const day = parseInt(parts[0]);
        const month = months[parts[1]];
        const year = parseInt(parts[2]);
        return new Date(year, month, day);
      };

      // 1. Seed Products
      const productLines = initialProductsCSV.split('\n').slice(1);
      productLines.forEach((line) => {
        const parts = parseCSVLine(line);
        if (parts.length < 11) return;
        
        const skuId = parts[0];
        const name = parts[1];
        const brand = name.split(' - ')[0] || 'Unknown';
        const category = parts[2];
        const size = parts[3];
        const price = cleanNum(parts[4]);
        const totalIn = cleanNum(parts[5]);
        const totalOut = cleanNum(parts[6]);
        const stock = cleanNum(parts[7]);
        const valueStock = cleanNum(parts[8]);
        const reorderLevel = cleanNum(parts[9]);
        const status = parts[10] as 'OK' | 'LOW';

        const productRef = doc(collection(db, 'products'), skuId); // Use SKU as ID for easier lookup
        batch.set(productRef, {
          skuId, name, brand, category, size, price, totalIn, totalOut, stock, valueStock, reorderLevel, status,
          lastUpdated: serverTimestamp()
        });
      });

      // 2. Seed Stock In
      const stockInLines = initialStockInCSV.split('\n').slice(1);
      stockInLines.forEach((line) => {
        const parts = parseCSVLine(line);
        if (parts.length < 8) return;
        
        const date = parseDate(parts[1]);
        const skuId = parts[2];
        const name = parts[3];
        const qty = cleanNum(parts[4]);
        const supplier = parts[7];
        const note = parts[12];

        const ledgerRef = doc(collection(db, 'ledger'));
        batch.set(ledgerRef, {
          skuId, productName: name, type: 'IN', quantity: qty, 
          supplier: supplier || 'Unknown', note: note || 'Initial Import', 
          timestamp: date
        });
      });

      // 3. Seed Stock Out
      const stockOutLines = initialStockOutCSV.split('\n').slice(1);
      stockOutLines.forEach((line) => {
        const parts = parseCSVLine(line);
        if (parts.length < 8) return;
        
        const date = parseDate(parts[1]);
        const skuId = parts[2];
        const name = parts[3];
        const qty = cleanNum(parts[4]);
        const channel = parts[7];
        const note = parts[12];

        const ledgerRef = doc(collection(db, 'ledger'));
        batch.set(ledgerRef, {
          skuId, productName: name, type: 'OUT', quantity: qty, 
          channel: channel || 'Offline Store', note: note || 'Initial Import', 
          timestamp: date
        });
      });

      await batch.commit();
    } catch (err) {
      console.error("Seeding failed", err);
    }
  };

  const handleTransaction = async (product: Product, type: 'IN' | 'OUT', qty: number, channelOrSupplier: string, note: string = '') => {
    if (qty <= 0) return;
    
    try {
      const newStock = type === 'IN' ? product.stock + qty : product.stock - qty;
      if (newStock < 0) throw new Error("Insufficient stock");

      const newTotalIn = type === 'IN' ? product.totalIn + qty : product.totalIn;
      const newTotalOut = type === 'OUT' ? product.totalOut + qty : product.totalOut;
      const newValueStock = newStock * product.price;
      const status = newStock <= product.reorderLevel ? 'LOW' : 'OK';

      // Update Product
      await updateDoc(doc(db, 'products', product.id!), {
        stock: newStock,
        totalIn: newTotalIn,
        totalOut: newTotalOut,
        valueStock: newValueStock,
        status,
        lastUpdated: serverTimestamp()
      });

      // Add Ledger Entry
      const ledgerData: any = {
        skuId: product.skuId,
        productName: product.name,
        type,
        quantity: qty,
        note,
        timestamp: serverTimestamp()
      };

      if (type === 'IN') ledgerData.supplier = channelOrSupplier;
      else ledgerData.channel = channelOrSupplier;

      await addDoc(collection(db, 'ledger'), ledgerData);
    } catch (err) {
      handleFirestoreError(err, OperationType.WRITE, 'products/ledger');
    }
  };

  const exportToCSV = () => {
    const headers = [
      'SKU ID', 'Nama SKU', 'Kategori', 'Ukuran', 'Harga Jual', 
      'Total Masuk Approved', 'Total Keluar Approved', 'Stock Sistem', 
      'Value Stock (Harga Jual)', 'Reorder Level', 'Stock Status'
    ];
    
    const rows = products.map(p => [
      p.skuId,
      p.name,
      p.category,
      p.size,
      p.price,
      p.totalIn,
      p.totalOut,
      p.stock,
      p.valueStock,
      p.reorderLevel,
      p.status
    ]);

    const csvContent = [
      headers.join(','),
      ...rows.map(row => row.map(cell => `"${cell}"`).join(','))
    ].join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.setAttribute('href', url);
    link.setAttribute('download', `inventory_export_${new Date().toISOString().split('T')[0]}.csv`);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const exportToPDF = async () => {
    const doc = new jsPDF();
    const dateStr = new Date().toLocaleString('id-ID');
    
    // Header
    doc.setFontSize(22);
    doc.setTextColor(59, 130, 246); // Blue-600
    doc.text("Stock Ledger AI - Inventory Report", 14, 20);
    
    doc.setFontSize(10);
    doc.setTextColor(100);
    doc.text(`Generated on: ${dateStr}`, 14, 28);
    doc.text(`User: ${user?.email}`, 14, 33);

    // Summary Section
    doc.setFontSize(14);
    doc.setTextColor(0);
    doc.text("Executive Summary", 14, 45);
    
    const totalValue = products.reduce((sum, p) => sum + (typeof p.valueStock === 'number' ? p.valueStock : 0), 0);
    const summaryData = [
      ["Total SKUs", products.length.toString()],
      ["Low Stock Items", lowStockCount.toString()],
      ["Total Inventory Value", `Rp ${totalValue.toLocaleString()}`],
      ["Total Transactions", ledger.length.toString()]
    ];

    autoTable(doc, {
      startY: 50,
      head: [["Metric", "Value"]],
      body: summaryData,
      theme: 'striped',
      headStyles: { fillColor: [59, 130, 246] }
    });

    // Visual Analytics Section
    doc.addPage();
    doc.setFontSize(18);
    doc.setTextColor(59, 130, 246);
    doc.text("Visual Analytics & Trends", 14, 20);
    doc.setFontSize(10);
    doc.setTextColor(100);
    doc.text("Graphical representation of inventory performance", 14, 26);

    const captureChart = async (id: string, title: string, yPos: number) => {
      const element = document.getElementById(id);
      if (element) {
        try {
          const canvas = await html2canvas(element, {
            scale: 2,
            backgroundColor: "#ffffff",
            logging: false,
            useCORS: true
          });
          const imgData = canvas.toDataURL('image/png');
          doc.setFontSize(12);
          doc.setTextColor(0);
          doc.text(title, 14, yPos);
          doc.addImage(imgData, 'PNG', 14, yPos + 5, 180, 70);
          return true;
        } catch (err) {
          console.error(`Failed to capture chart ${id}:`, err);
          return false;
        }
      }
      return false;
    };

    // Capture primary charts
    let currentY = 35;
    await captureChart('chart-monthly', "Monthly Stock Trend (In vs Out)", currentY);
    currentY += 85;
    await captureChart('chart-movement', "Daily Stock Movement", currentY);
    currentY += 85;
    
    doc.addPage();
    currentY = 20;
    await captureChart('chart-sku', "Stock Levels per SKU", currentY);
    currentY += 85;
    await captureChart('chart-value', "Inventory Value per SKU", currentY);

    // Inventory Table
    doc.addPage();
    doc.setFontSize(16);
    doc.setTextColor(59, 130, 246);
    doc.text("Detailed Inventory Data", 14, 20);
    
    const tableData = products.map(p => [
      p.skuId,
      p.name,
      p.stock,
      `Rp ${p.price.toLocaleString()}`,
      `Rp ${p.valueStock.toLocaleString()}`,
      p.status
    ]);

    autoTable(doc, {
      startY: 30,
      head: [["SKU", "Name", "Stock", "Price", "Value", "Status"]],
      body: tableData,
      theme: 'grid',
      headStyles: { fillColor: [71, 85, 105] }, // Slate-600
      columnStyles: {
        2: { halign: 'right' },
        3: { halign: 'right' },
        4: { halign: 'right' }
      }
    });

    // Top Suppliers
    if (supplierData.length > 0) {
      doc.setFontSize(14);
      doc.text("Supplier Analysis", 14, (doc as any).lastAutoTable.finalY + 15);
      
      const supplierTable = supplierData.map(s => [
        s.name,
        s.value
      ]);

      autoTable(doc, {
        startY: (doc as any).lastAutoTable.finalY + 20,
        head: [["Supplier Name", "Total Units Received"]],
        body: supplierTable,
        theme: 'striped',
        headStyles: { fillColor: [139, 92, 246] } // Violet-500
      });
    }

    doc.save(`inventory_visual_report_${new Date().toISOString().split('T')[0]}.pdf`);
  };

  const handleResetData = async () => {
    if (!window.confirm("Are you sure you want to reset all data and re-seed from CSV? This will delete all current products and ledger entries.")) return;
    
    try {
      const batch = writeBatch(db);
      
      // Delete all products
      const productSnap = await getDocs(collection(db, 'products'));
      productSnap.forEach(doc => batch.delete(doc.ref));
      
      // Delete all ledger
      const ledgerSnap = await getDocs(collection(db, 'ledger'));
      ledgerSnap.forEach(doc => batch.delete(doc.ref));
      
      await batch.commit();
      await seedInitialData();
      alert("Data reset and re-seeded successfully!");
    } catch (err) {
      console.error("Reset failed", err);
    }
  };
  const handleAIAnalysis = async () => {
    setAnalyzing(true);
    try {
      const result = await analyzeStock(products);
      setAiAnalysis(result);
    } catch (err) {
      console.error("Analysis failed:", err);
      setAiAnalysis("Failed to generate analysis. Please try again.");
    } finally {
      setAnalyzing(false);
    }
  };

  const filteredProducts = products.filter(p => 
    p.name.toLowerCase().includes(searchTerm.toLowerCase()) || 
    p.skuId.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const lowStockCount = products.filter(p => p.status === 'LOW').length;

  const categoryData = useMemo(() => {
    const counts: Record<string, number> = {};
    products.forEach(p => {
      counts[p.category] = (counts[p.category] || 0) + p.stock;
    });
    return Object.entries(counts).map(([name, value]) => ({ name, value }));
  }, [products]);

  const movementData = useMemo(() => {
    const movements: Record<string, { date: string, in: number, out: number, sortKey: number }> = {};
    
    // Get last 30 days of activity
    const now = new Date();
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(now.getDate() - 30);

    // Initialize days
    let curr = new Date(thirtyDaysAgo);
    while (curr <= now) {
      const label = curr.toLocaleDateString('id-ID', { day: 'numeric', month: 'short' });
      movements[label] = { date: label, in: 0, out: 0, sortKey: curr.getTime() };
      curr.setDate(curr.getDate() + 1);
    }

    ledger.forEach(e => {
      if (!e.timestamp || typeof e.timestamp.toDate !== 'function') return;
      const d = e.timestamp.toDate();
      if (d < thirtyDaysAgo) return; // Only for daily chart
      const label = d.toLocaleDateString('id-ID', { day: 'numeric', month: 'short' });
      
      if (movements[label]) {
        if (e.type === 'IN') movements[label].in += e.quantity;
        else movements[label].out += e.quantity;
      }
    });
    
    return Object.values(movements).sort((a, b) => a.sortKey - b.sortKey);
  }, [ledger]);

  const monthlyTrendData = useMemo(() => {
    const months: Record<string, { month: string, in: number, out: number, sortKey: number }> = {};
    
    ledger.forEach(e => {
      if (!e.timestamp || typeof e.timestamp.toDate !== 'function') return;
      const d = e.timestamp.toDate();
      const label = d.toLocaleDateString('id-ID', { month: 'short', year: 'numeric' });
      
      if (!months[label]) {
        const firstDayOfMonth = new Date(d.getFullYear(), d.getMonth(), 1);
        months[label] = { month: label, in: 0, out: 0, sortKey: firstDayOfMonth.getTime() };
      }
      if (e.type === 'IN') months[label].in += e.quantity;
      else months[label].out += e.quantity;
    });
    
    return Object.values(months).sort((a, b) => a.sortKey - b.sortKey);
  }, [ledger]);

  const skuStockData = useMemo(() => {
    return products.map(p => ({
      name: p.skuId,
      stock: p.stock
    })).sort((a, b) => b.stock - a.stock).slice(0, 15);
  }, [products]);

  const brandData = useMemo(() => {
    const brands: Record<string, number> = {};
    products.forEach(p => {
      if (p.brand) {
        brands[p.brand] = (brands[p.brand] || 0) + p.stock;
      }
    });
    return Object.entries(brands).map(([name, value]) => ({ name, value }));
  }, [products]);

  const channelData = useMemo(() => {
    const channels: Record<string, number> = {};
    ledger.filter(e => e.type === 'OUT').forEach(e => {
      const c = e.channel || 'Other';
      channels[c] = (channels[c] || 0) + e.quantity;
    });
    return Object.entries(channels).map(([name, value]) => ({ name, value }));
  }, [ledger]);

  const supplierData = useMemo(() => {
    const suppliers: Record<string, number> = {};
    ledger.filter(e => e.type === 'IN').forEach(e => {
      const s = e.supplier || 'Other';
      suppliers[s] = (suppliers[s] || 0) + e.quantity;
    });
    return Object.entries(suppliers).map(([name, value]) => ({ name, value }));
  }, [ledger]);

  const stockValueData = useMemo(() => {
    return products.slice(0, 10).map(p => ({
      name: p.skuId,
      value: p.stock * p.price
    })).sort((a, b) => b.value - a.value);
  }, [products]);

  if (!user) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen bg-slate-50 p-4">
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="max-w-md w-full text-center"
        >
          <div className="bg-white p-8 rounded-3xl shadow-xl border border-slate-200">
            <div className="w-20 h-20 bg-blue-600 rounded-2xl flex items-center justify-center mx-auto mb-6 shadow-lg shadow-blue-200">
              <Package className="w-10 h-10 text-white" />
            </div>
            <h1 className="text-3xl font-bold text-slate-900 mb-2">Stock Ledger AI</h1>
            <p className="text-slate-500 mb-8">Real-time inventory automation with AI insights.</p>
            <Button 
              onClick={() => signInWithPopup(auth, googleProvider)}
              className="w-full h-12 text-lg rounded-xl bg-blue-600 hover:bg-blue-700 transition-all font-semibold"
            >
              <LogIn className="w-5 h-5 mr-2" />
              Sign in with Google
            </Button>
          </div>
        </motion.div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col">
      {/* Header */}
      <header className="bg-white border-b border-slate-200 sticky top-0 z-10 px-6 py-4 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-blue-600 rounded-xl flex items-center justify-center shadow-md shadow-blue-100">
            <Package className="w-6 h-6 text-white" />
          </div>
          <div>
            <h1 className="text-xl font-bold text-slate-900 leading-tight">Stock Ledger AI</h1>
            <p className="text-xs text-slate-500 font-medium uppercase tracking-wider">Automation System</p>
          </div>
        </div>

        <div className="flex items-center gap-4">
          <div className="relative">
            <Bell className="w-6 h-6 text-slate-400 cursor-pointer hover:text-blue-600 transition-colors" />
            {lowStockCount > 0 && (
              <span className="absolute -top-1 -right-1 bg-red-500 text-white text-[10px] font-bold px-1.5 py-0.5 rounded-full border-2 border-white">
                {lowStockCount}
              </span>
            )}
          </div>
          <div className="h-8 w-[1px] bg-slate-200" />
          <div className="flex items-center gap-3">
            <Button 
              variant="ghost" 
              size="sm" 
              onClick={handleResetData}
              className="text-slate-400 hover:text-red-500 hidden sm:flex"
            >
              Reset Data
            </Button>
            <div className="text-right hidden sm:block">
              <p className="text-sm font-semibold text-slate-900">{user.displayName}</p>
              <p className="text-xs text-slate-500">{user.email}</p>
            </div>
            <Button variant="ghost" size="icon" onClick={() => signOut(auth)} className="rounded-full hover:bg-red-50 hover:text-red-600">
              <LogOut className="w-5 h-5" />
            </Button>
          </div>
        </div>
      </header>

      <main className="flex-1 p-6 max-w-7xl mx-auto w-full space-y-6">
        {/* Stats Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          <Card className="border-none shadow-sm bg-white overflow-hidden group">
            <CardContent className="p-6">
              <div className="flex items-center justify-between mb-4">
                <div className="p-2 bg-blue-50 rounded-lg group-hover:bg-blue-100 transition-colors">
                  <Package className="w-6 h-6 text-blue-600" />
                </div>
                <Badge variant="secondary" className="bg-blue-50 text-blue-700 border-none">Total SKU</Badge>
              </div>
              <p className="text-3xl font-bold text-slate-900">{products.length}</p>
              <p className="text-sm text-slate-500 mt-1">Items in inventory</p>
            </CardContent>
          </Card>

          <Card className="border-none shadow-sm bg-white overflow-hidden group">
            <CardContent className="p-6">
              <div className="flex items-center justify-between mb-4">
                <div className="p-2 bg-amber-50 rounded-lg group-hover:bg-amber-100 transition-colors">
                  <AlertCircle className="w-6 h-6 text-amber-600" />
                </div>
                <Badge variant="secondary" className="bg-amber-50 text-amber-700 border-none">Low Stock</Badge>
              </div>
              <p className="text-3xl font-bold text-slate-900">{lowStockCount}</p>
              <p className="text-sm text-slate-500 mt-1">Items need reorder</p>
            </CardContent>
          </Card>

          <Card className="border-none shadow-sm bg-white overflow-hidden group">
            <CardContent className="p-6">
              <div className="flex items-center justify-between mb-4">
                <div className="p-2 bg-emerald-50 rounded-lg group-hover:bg-emerald-100 transition-colors">
                  <TrendingUp className="w-6 h-6 text-emerald-600" />
                </div>
                <Badge variant="secondary" className="bg-emerald-50 text-emerald-700 border-none">Value</Badge>
              </div>
              <p className="text-3xl font-bold text-slate-900">
                Rp {products.reduce((acc, p) => acc + (p.stock * p.price), 0).toLocaleString()}
              </p>
              <p className="text-sm text-slate-500 mt-1">Total inventory value</p>
            </CardContent>
          </Card>

          <Card className="border-none shadow-sm bg-white overflow-hidden group">
            <CardContent className="p-6">
              <div className="flex items-center justify-between mb-4">
                <div className="p-2 bg-indigo-50 rounded-lg group-hover:bg-indigo-100 transition-colors">
                  <History className="w-6 h-6 text-indigo-600" />
                </div>
                <Badge variant="secondary" className="bg-indigo-50 text-indigo-700 border-none">Activity</Badge>
              </div>
              <p className="text-3xl font-bold text-slate-900">{ledger.length}</p>
              <p className="text-sm text-slate-500 mt-1">Transactions logged</p>
            </CardContent>
          </Card>
        </div>

        {/* AI Insights Section */}
        <Card className="border-none shadow-md bg-gradient-to-br from-indigo-600 to-blue-700 text-white overflow-hidden relative">
          <div className="absolute top-0 right-0 p-8 opacity-10">
            <BrainCircuit className="w-32 h-32" />
          </div>
          <CardHeader className="pb-2">
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="text-2xl flex items-center gap-2">
                  <BrainCircuit className="w-6 h-6" />
                  Gemini AI Insights
                </CardTitle>
                <CardDescription className="text-indigo-100">Automated stock analysis and predictions</CardDescription>
              </div>
              <Button 
                onClick={handleAIAnalysis} 
                disabled={analyzing}
                className="bg-white text-indigo-600 hover:bg-indigo-50 font-bold px-6"
              >
                {analyzing ? 'Analyzing...' : 'Generate Analysis'}
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            <AnimatePresence mode="wait">
              {aiAnalysis ? (
                <motion.div 
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="bg-white/10 backdrop-blur-md rounded-xl p-4 mt-2 border border-white/20"
                >
                  <p className="text-sm leading-relaxed whitespace-pre-wrap">{aiAnalysis}</p>
                </motion.div>
              ) : (
                <p className="text-indigo-100 italic mt-2">Click the button to get AI-powered inventory recommendations.</p>
              )}
            </AnimatePresence>
          </CardContent>
        </Card>

        <Tabs defaultValue="dashboard" className="w-full">
          <TabsList className="bg-white border border-slate-200 p-1 rounded-xl mb-6">
            <TabsTrigger value="dashboard" className="rounded-lg data-[state=active]:bg-blue-600 data-[state=active]:text-white">
              <LayoutDashboard className="w-4 h-4 mr-2" />
              Dashboard
            </TabsTrigger>
            <TabsTrigger value="inventory" className="rounded-lg data-[state=active]:bg-blue-600 data-[state=active]:text-white">
              <Package className="w-4 h-4 mr-2" />
              Inventory
            </TabsTrigger>
            <TabsTrigger value="ledger" className="rounded-lg data-[state=active]:bg-blue-600 data-[state=active]:text-white">
              <History className="w-4 h-4 mr-2" />
              Ledger
            </TabsTrigger>
            <TabsTrigger value="ai" className="rounded-lg data-[state=active]:bg-blue-600 data-[state=active]:text-white">
              <BrainCircuit className="w-4 h-4 mr-2" />
              AI Assistant
            </TabsTrigger>
          </TabsList>

          <TabsContent value="dashboard" className="space-y-6">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <Card className="border-none shadow-sm">
                <CardHeader>
                  <CardTitle>Stock per Brand</CardTitle>
                  <CardDescription>Inventory distribution by brand</CardDescription>
                </CardHeader>
                <CardContent className="h-[300px]" id="chart-brand">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={brandData} layout="vertical">
                      <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="#f1f5f9" />
                      <XAxis type="number" fontSize={10} axisLine={false} tickLine={false} />
                      <YAxis dataKey="name" type="category" fontSize={10} axisLine={false} tickLine={false} width={80} />
                      <Tooltip 
                        contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)' }}
                      />
                      <Bar dataKey="value" fill="#6366f1" radius={[0, 4, 4, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                </CardContent>
              </Card>

              <Card className="border-none shadow-sm">
                <CardHeader>
                  <CardTitle>Daily Stock Movement</CardTitle>
                  <CardDescription>Stock in vs stock out for current month</CardDescription>
                </CardHeader>
                <CardContent className="h-[300px]" id="chart-movement">
                  <ResponsiveContainer width="100%" height="100%">
                    <LineChart data={movementData}>
                      <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                      <XAxis dataKey="date" fontSize={10} axisLine={false} tickLine={false} />
                      <YAxis fontSize={10} axisLine={false} tickLine={false} />
                      <Tooltip 
                        contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)' }}
                      />
                      <Legend />
                      <Line type="monotone" dataKey="in" name="Masuk" stroke="#10b981" strokeWidth={2} dot={false} activeDot={{ r: 6 }} />
                      <Line type="monotone" dataKey="out" name="Keluar" stroke="#f59e0b" strokeWidth={2} dot={false} activeDot={{ r: 6 }} />
                    </LineChart>
                  </ResponsiveContainer>
                </CardContent>
              </Card>

              <Card className="border-none shadow-sm">
                <CardHeader>
                  <CardTitle>Penjualan per Channel</CardTitle>
                  <CardDescription>Distribution of sales across channels</CardDescription>
                </CardHeader>
                <CardContent className="h-[300px]" id="chart-channel">
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={channelData}
                        cx="50%"
                        cy="50%"
                        innerRadius={60}
                        outerRadius={80}
                        paddingAngle={5}
                        dataKey="value"
                      >
                        {channelData.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                        ))}
                      </Pie>
                      <Tooltip />
                      <Legend />
                    </PieChart>
                  </ResponsiveContainer>
                </CardContent>
              </Card>

              <Card className="border-none shadow-sm">
                <CardHeader>
                  <CardTitle>Monthly Stock Trend</CardTitle>
                  <CardDescription>Long-term stock movement history</CardDescription>
                </CardHeader>
                <CardContent className="h-[300px]" id="chart-monthly">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={monthlyTrendData}>
                      <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                      <XAxis dataKey="month" fontSize={10} axisLine={false} tickLine={false} />
                      <YAxis fontSize={10} axisLine={false} tickLine={false} />
                      <Tooltip 
                        contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)' }}
                      />
                      <Legend verticalAlign="top" align="right" height={36}/>
                      <Bar name="Stock In" dataKey="in" fill="#3b82f6" radius={[4, 4, 0, 0]} />
                      <Bar name="Stock Out" dataKey="out" fill="#f59e0b" radius={[4, 4, 0, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                </CardContent>
              </Card>

              <Card className="border-none shadow-sm">
                <CardHeader>
                  <CardTitle>Stock per SKU</CardTitle>
                  <CardDescription>Current stock level for each item</CardDescription>
                </CardHeader>
                <CardContent className="h-[300px]" id="chart-sku">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={skuStockData}>
                      <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                      <XAxis dataKey="name" fontSize={10} axisLine={false} tickLine={false} />
                      <YAxis fontSize={10} axisLine={false} tickLine={false} />
                      <Tooltip 
                        contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)' }}
                      />
                      <Bar dataKey="stock" fill="#ec4899" radius={[4, 4, 0, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                </CardContent>
              </Card>

              <Card className="border-none shadow-sm">
                <CardHeader>
                  <CardTitle>Top Suppliers</CardTitle>
                  <CardDescription>Volume of stock received by supplier</CardDescription>
                </CardHeader>
                <CardContent className="h-[300px]" id="chart-supplier">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={supplierData} layout="vertical">
                      <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="#f1f5f9" />
                      <XAxis type="number" fontSize={10} axisLine={false} tickLine={false} />
                      <YAxis dataKey="name" type="category" fontSize={10} axisLine={false} tickLine={false} width={100} />
                      <Tooltip 
                        contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)' }}
                      />
                      <Bar dataKey="value" fill="#8b5cf6" radius={[0, 4, 4, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                </CardContent>
              </Card>

              <Card className="border-none shadow-sm">
                <CardHeader>
                  <CardTitle>Top Inventory Value (SKU)</CardTitle>
                  <CardDescription>Highest value items in stock</CardDescription>
                </CardHeader>
                <CardContent className="h-[300px]" id="chart-value">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={stockValueData}>
                      <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                      <XAxis dataKey="name" fontSize={10} axisLine={false} tickLine={false} />
                      <YAxis fontSize={10} axisLine={false} tickLine={false} tickFormatter={(val) => `Rp${(val/1000000).toFixed(1)}M`} />
                      <Tooltip 
                        formatter={(val: number) => `Rp ${val.toLocaleString()}`}
                        contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)' }}
                      />
                      <Bar dataKey="value" fill="#3b82f6" radius={[4, 4, 0, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          <TabsContent value="ai" className="space-y-6">
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              <div className="lg:col-span-2 space-y-6">
                <Card className="border-none shadow-sm bg-gradient-to-br from-indigo-600 to-violet-700 text-white overflow-hidden relative">
                  <div className="absolute top-0 right-0 p-8 opacity-10">
                    <BrainCircuit className="w-32 h-32" />
                  </div>
                  <CardHeader>
                    <CardTitle className="text-2xl">AI Inventory Assistant</CardTitle>
                    <CardDescription className="text-indigo-100">Get smart insights and predictions for your stock</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <Button 
                      onClick={handleAIAnalysis} 
                      disabled={analyzing}
                      className="bg-white text-indigo-600 hover:bg-indigo-50 rounded-xl px-8 py-6 h-auto text-lg font-bold shadow-lg"
                    >
                      {analyzing ? (
                        <>
                          <div className="w-5 h-5 border-2 border-indigo-600 border-t-transparent rounded-full animate-spin mr-2" />
                          Analyzing...
                        </>
                      ) : (
                        <>
                          <BrainCircuit className="w-6 h-6 mr-2" />
                          Generate Analysis
                        </>
                      )}
                    </Button>
                  </CardContent>
                </Card>

                {aiAnalysis && (
                  <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                  >
                    <Card className="border-none shadow-sm">
                      <CardHeader>
                        <CardTitle className="flex items-center gap-2">
                          <BrainCircuit className="w-5 h-5 text-indigo-600" />
                          AI Insights & Recommendations
                        </CardTitle>
                      </CardHeader>
                      <CardContent className="prose prose-slate max-w-none">
                        <div className="bg-slate-50 p-6 rounded-2xl border border-slate-100 whitespace-pre-wrap text-slate-700 leading-relaxed">
                          {aiAnalysis}
                        </div>
                      </CardContent>
                    </Card>
                  </motion.div>
                )}
              </div>

              <div className="space-y-6">
                <Card className="border-none shadow-sm">
                  <CardHeader>
                    <CardTitle className="text-sm font-bold uppercase tracking-wider text-slate-500">Suggested Features</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="p-4 rounded-xl border border-slate-100 hover:border-indigo-200 hover:bg-indigo-50/30 transition-all cursor-pointer group">
                      <h4 className="font-bold text-slate-900 group-hover:text-indigo-600 flex items-center gap-2">
                        <TrendingUp className="w-4 h-4" />
                        Reorder Prediction
                      </h4>
                      <p className="text-xs text-slate-500 mt-1">Predict when stock will run out based on daily sales velocity.</p>
                    </div>
                    <div className="p-4 rounded-xl border border-slate-100 hover:border-emerald-200 hover:bg-emerald-50/30 transition-all cursor-pointer group">
                      <h4 className="font-bold text-slate-900 group-hover:text-emerald-600 flex items-center gap-2">
                        <LayoutDashboard className="w-4 h-4" />
                        Value Trend Chart
                      </h4>
                      <p className="text-xs text-slate-500 mt-1">Track how the total value of your warehouse changes over time.</p>
                    </div>
                    <div className="p-4 rounded-xl border border-slate-100 hover:border-amber-200 hover:bg-amber-50/30 transition-all cursor-pointer group">
                      <h4 className="font-bold text-slate-900 group-hover:text-amber-600 flex items-center gap-2">
                        <Bell className="w-4 h-4" />
                        Smart Alerts
                      </h4>
                      <p className="text-xs text-slate-500 mt-1">Get push notifications when critical items hit reorder levels.</p>
                    </div>
                  </CardContent>
                </Card>
              </div>
            </div>
          </TabsContent>

          <TabsContent value="inventory">
            <Card className="border-none shadow-sm">
              <CardHeader className="flex flex-row items-center justify-between space-y-0">
                <div>
                  <CardTitle>Inventory List</CardTitle>
                  <CardDescription>Manage your stock items and reorder levels</CardDescription>
                </div>
                <div className="flex items-center gap-4">
                  <div className="relative w-64">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                    <Input 
                      placeholder="Search SKU or Name..." 
                      className="pl-10 rounded-xl border-slate-200"
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                    />
                  </div>
                  <Button 
                    variant="outline" 
                    onClick={exportToPDF}
                    className="rounded-xl border-blue-200 text-blue-600 hover:bg-blue-50"
                  >
                    <Download className="w-4 h-4 mr-2" />
                    Download PDF Report
                  </Button>
                  <Button 
                    variant="outline" 
                    onClick={exportToCSV}
                    className="rounded-xl border-slate-200 text-slate-600 hover:bg-slate-50"
                  >
                    <Download className="w-4 h-4 mr-2" />
                    Export CSV
                  </Button>
                </div>
              </CardHeader>
              <CardContent>
                <div className="rounded-xl border border-slate-100 overflow-hidden">
                  <Table>
                    <TableHeader className="bg-slate-50">
                      <TableRow>
                        <TableHead>SKU ID</TableHead>
                        <TableHead>Product Name</TableHead>
                        <TableHead>Category</TableHead>
                        <TableHead>Size</TableHead>
                        <TableHead className="text-right">Price</TableHead>
                        <TableHead className="text-right">Total In</TableHead>
                        <TableHead className="text-right">Total Out</TableHead>
                        <TableHead className="text-right">Stock</TableHead>
                        <TableHead className="text-right">Value Stock</TableHead>
                        <TableHead className="text-right">Reorder</TableHead>
                        <TableHead>Status</TableHead>
                        <TableHead className="text-right">Actions</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {filteredProducts.map((product) => (
                        <TableRow key={product.id} className="hover:bg-slate-50/50 transition-colors">
                          <TableCell className="font-mono text-xs font-bold text-slate-600">{product.skuId}</TableCell>
                          <TableCell className="font-semibold text-slate-900">{product.name}</TableCell>
                          <TableCell>
                            <Badge variant="outline" className="font-normal text-slate-600 border-slate-200">
                              {product.category}
                            </Badge>
                          </TableCell>
                          <TableCell className="text-xs">{product.size}</TableCell>
                          <TableCell className="text-right text-xs">Rp{product.price.toLocaleString()}</TableCell>
                          <TableCell className="text-right text-xs text-emerald-600">{product.totalIn}</TableCell>
                          <TableCell className="text-right text-xs text-amber-600">{product.totalOut}</TableCell>
                          <TableCell className="text-right font-bold text-slate-900">{product.stock}</TableCell>
                          <TableCell className="text-right text-xs font-semibold">Rp{product.valueStock.toLocaleString()}</TableCell>
                          <TableCell className="text-right text-xs text-slate-500">{product.reorderLevel}</TableCell>
                          <TableCell>
                            {product.status === 'LOW' ? (
                              <Badge className="bg-red-100 text-red-700 hover:bg-red-100 border-none">
                                <AlertCircle className="w-3 h-3 mr-1" />
                                Low
                              </Badge>
                            ) : (
                              <Badge className="bg-emerald-100 text-emerald-700 hover:bg-emerald-100 border-none">
                                OK
                              </Badge>
                            )}
                          </TableCell>
                          <TableCell className="text-right">
                            <div className="flex justify-end gap-2">
                              <TransactionDialog 
                                product={product} 
                                type="IN" 
                                onConfirm={(qty, channel, note) => handleTransaction(product, 'IN', qty, channel, note)} 
                              />
                              <TransactionDialog 
                                product={product} 
                                type="OUT" 
                                onConfirm={(qty, channel, note) => handleTransaction(product, 'OUT', qty, channel, note)} 
                              />
                            </div>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="ledger">
            <Card className="border-none shadow-sm">
              <CardHeader>
                <CardTitle>Stock Ledger</CardTitle>
                <CardDescription>Full audit trail of all stock movements</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="rounded-xl border border-slate-100 overflow-hidden">
                  <Table>
                    <TableHeader className="bg-slate-50">
                      <TableRow>
                        <TableHead>Timestamp</TableHead>
                        <TableHead>SKU</TableHead>
                        <TableHead>Product</TableHead>
                        <TableHead>Type</TableHead>
                        <TableHead>Channel/Supplier</TableHead>
                        <TableHead className="text-right">Quantity</TableHead>
                        <TableHead>Note</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {ledger.map((entry) => (
                        <TableRow key={entry.id}>
                          <TableCell className="text-xs text-slate-500">
                            {entry.timestamp?.toDate().toLocaleString()}
                          </TableCell>
                          <TableCell className="font-mono text-xs font-bold">{entry.skuId}</TableCell>
                          <TableCell className="font-medium">{entry.productName}</TableCell>
                          <TableCell>
                            {entry.type === 'IN' ? (
                              <Badge className="bg-blue-100 text-blue-700 hover:bg-blue-100 border-none">STOCK IN</Badge>
                            ) : (
                              <Badge className="bg-amber-100 text-amber-700 hover:bg-amber-100 border-none">STOCK OUT</Badge>
                            )}
                          </TableCell>
                          <TableCell className="text-xs font-medium text-slate-600">
                            {entry.type === 'IN' ? entry.supplier : entry.channel}
                          </TableCell>
                          <TableCell className="text-right font-bold">
                            {entry.type === 'IN' ? `+${entry.quantity}` : `-${entry.quantity}`}
                          </TableCell>
                          <TableCell className="text-slate-500 italic max-w-xs truncate">{entry.note || '-'}</TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
                <div className="mt-4 flex justify-center">
                  <Button 
                    variant="outline" 
                    onClick={() => setLedgerLimit(prev => prev + 50)}
                    className="rounded-xl border-slate-200 text-slate-600 hover:bg-slate-50"
                  >
                    <History className="w-4 h-4 mr-2" />
                    Load More History
                  </Button>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </main>
    </div>
  );
}

function TransactionDialog({ product, type, onConfirm }: { product: Product, type: 'IN' | 'OUT', onConfirm: (qty: number, channelOrSupplier: string, note: string) => void }) {
  const [qty, setQty] = useState('1');
  const [channelOrSupplier, setChannelOrSupplier] = useState(type === 'IN' ? '' : 'Offline Store');
  const [note, setNote] = useState('');
  const [open, setOpen] = useState(false);

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button 
          variant="outline" 
          size="sm" 
          className={type === 'IN' ? 'border-blue-200 text-blue-600 hover:bg-blue-50' : 'border-amber-200 text-amber-600 hover:bg-amber-50'}
        >
          {type === 'IN' ? <Plus className="w-4 h-4" /> : <Minus className="w-4 h-4" />}
          {type}
        </Button>
      </DialogTrigger>
      <DialogContent className="rounded-3xl sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            {type === 'IN' ? <Plus className="w-5 h-5 text-blue-600" /> : <Minus className="w-5 h-5 text-amber-600" />}
            Stock {type === 'IN' ? 'In' : 'Out'}
          </DialogTitle>
          <DialogDescription>
            Update stock for <span className="font-bold text-slate-900">{product.name}</span>
          </DialogDescription>
        </DialogHeader>
        <div className="grid gap-4 py-4">
          <div className="grid gap-2">
            <label className="text-sm font-semibold text-slate-700">Quantity</label>
            <Input 
              type="number" 
              value={qty} 
              onChange={(e) => setQty(e.target.value)} 
              className="rounded-xl"
            />
          </div>
          <div className="grid gap-2">
            <label className="text-sm font-semibold text-slate-700">{type === 'IN' ? 'Supplier' : 'Channel'}</label>
            {type === 'IN' ? (
              <Input 
                placeholder="Enter supplier name..." 
                value={channelOrSupplier} 
                onChange={(e) => setChannelOrSupplier(e.target.value)} 
                className="rounded-xl"
              />
            ) : (
              <Select value={channelOrSupplier} onValueChange={setChannelOrSupplier}>
                <SelectTrigger className="rounded-xl">
                  <SelectValue placeholder="Select channel" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="Offline Store">Offline Store</SelectItem>
                  <SelectItem value="Event">Event</SelectItem>
                  <SelectItem value="Influencer">Influencer</SelectItem>
                  <SelectItem value="Mitra">Mitra</SelectItem>
                  <SelectItem value="FO">FO</SelectItem>
                  <SelectItem value="Sampel">Sampel</SelectItem>
                </SelectContent>
              </Select>
            )}
          </div>
          <div className="grid gap-2">
            <label className="text-sm font-semibold text-slate-700">Note (Optional)</label>
            <Input 
              placeholder="Reason for movement..." 
              value={note} 
              onChange={(e) => setNote(e.target.value)} 
              className="rounded-xl"
            />
          </div>
        </div>
        <DialogFooter>
          <Button 
            onClick={() => {
              onConfirm(parseInt(qty), channelOrSupplier, note);
              setOpen(false);
              setQty('1');
              setNote('');
            }}
            className={type === 'IN' ? 'bg-blue-600 hover:bg-blue-700' : 'bg-amber-600 hover:bg-amber-700'}
          >
            Confirm {type}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
