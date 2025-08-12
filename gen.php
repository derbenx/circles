<?php
$nxc=0; // toggle for nextcloud servers
//fixed points config
$maxx=[0,1,2,1,2,1,1,1,0];
//$scale=1.1;
//grid bytes:
// 1 drag: 0=blank 1=fixed 2=move:+ 3=UD:- 4=LR:|
// 2 click: 0=nothing 1=rotate:O 2=flipH:U 3=flipV:C
// 3+: tag colors 0=null ryvb
$file=false;
$wdh=isset($_POST["wdh"]) ? substr($_POST["wdh"],0,2) : 4; //wsize
$hgt=isset($_POST["hgt"]) ? substr($_POST["hgt"],0,2) : 4; //hsize
$mov=isset($_POST["mov"]) ? substr($_POST["mov"],0,1) : 2; //movement
$rot=isset($_POST["rot"]) ? substr($_POST["rot"],0,1) : 1; //rotate
$clr=isset($_POST["clr"]) ? substr($_POST["clr"],0,1) : 5; //colour
$pct=isset($_POST["pct"]) ? substr($_POST["pct"],0,2) : 55; //percent
$pnt=isset($_POST["pnt"]) ? substr($_POST["pnt"],0,1) : -1; //fixed
$rat=isset($_POST["rat"]) ? substr($_POST["rat"],0,1) : 0; //ratio
//$ww=isset($_POST["ww"]) ? $_POST["ww"] : 1280;
//$hh=isset($_POST["hh"]) ? $_POST["hh"] : 720;
if ($wdh<3 || $wdh>40) { $wdh=4; }
if ($hgt<3 || $hgt>40) { $hgt=4; }
if ($mov<2 || $mov>4) { $mov=2; }
if ($rot<0 || $rot>3) { $rot=1; }
if ($clr<2 || $clr>9) { $clr=3; }
if ($pct<20 || $pct>80) { $pct=55; }
if ($pnt<0 || $pnt>9) { $pnt=-1; }

//Sort out screen and board
//$wh=$ww/$hh; //ratio >1=hori <1=vert
$grid=[];
$col='grybvcplei';
$col=substr($col,0,$clr+1);
$out="{";
$xx=$wdh;
$yy=$hgt;
 
//create start pos
$sx=mt_rand(0,$xx-1);
$sy=mt_rand(0,$yy-1);
$sc='';
$sc.= $sx>0 ? substr($col,mt_rand(1,strlen($col)-1),1) : '0'; //lf
$sc.= $sy>0 ? substr($col,mt_rand(1,strlen($col)-1),1) : '0'; //up
$sc.= $sx<$xx-1 ? substr($col,mt_rand(1,strlen($col)-1),1) : '0'; //rt
$sc.= $sy<$yy-1 ? substr($col,mt_rand(1,strlen($col)-1),1) : '0'; //dn

//$out.='"col":"'.$col.'", "xx":"'.$xx.'", "yy":"'.$yy.'", "ww":"'.$www.'", "hh":"'.$hhh.'", "w":"'.$ww.'", "h":"'.$hh.'", ';
$out.='"col":"'.$col.'", "xx":"'.$xx.'", "yy":"'.$yy.'", "ww":"'.$www.'", "hh":"'.$hhh.'", ';

//make array with start pos
$mo='2';
$ro='0';
for ($y=0; $y<$yy; $y++) {
 for ($x=0; $x<$xx; $x++) {
  $tmp= $x==$sx && $y==$sy ? $mo.$ro. $sc : str_repeat('0',6);
  $grid[$x][$y]= $tmp;
 }
}
 //generate tags
$unsort=[$mo.$ro.'-'.$sx.'-'.$sy];
$prx=$sx;$pry=$sy;

if ($pnt==-1) {
  $max=($xx<count($maxx)) ? $maxx[$xx] : 0;
} else {
 $max=$pnt;
}


//$pm=posmov($sx,$sy,$xx,$yy,$grid);
//$out.='"p1":"'.$sx.'", "p2":"'.$sy.'", "pm":"'.$pm.'", ';


$mp=0; $rew=[];
//$pc=($xx*$yy)/1.8;
$pc=($xx*$yy)*($pct/100);
//echo PHP_EOL."// pc%:$pc xy:".($xx*$yy)." pct:$pct".PHP_EOL;
for ($i=1; $i<$pc; $i++) {
 $pm=posmov($sx,$sy,$xx,$yy,$grid);
 if (strlen($pm)==0){
  while (strlen($pm)>3 || strlen($pm)<1) {
   //rewind to find alt route
   $tmp=mt_rand(1,count($rew[0])-2);
   $sx=$rew[0][$tmp];
   $sy=$rew[1][$tmp];
   $pm=posmov($sx,$sy,$xx,$yy,$grid);
  }
 }
 if (strlen($pm)>0){
  $pm=substr($pm,mt_rand(0,strlen($pm)-1),1);
  if ($mp<$max) { $mo=mt_rand(1,$mov); }
  else { $mo=mt_rand(2,$mov); }
  if ($mo=='1') { $mp++; }
  $ro=mt_rand(0,$rot);
  if ($pm=='L'){ $sx--; }
  if ($pm=='U'){ $sy--; }
  if ($pm=='R'){ $sx++; }
  if ($pm=='D'){ $sy++; }
  //print PHP_EOL.'//'.$sx."x".$sy;
  //log coords $rew
  $rew[0][]=$sx;
  $rew[1][]=$sy;
  $grid[$sx][$sy]=$mo.$ro.gentag($sx,$sy,$xx,$yy,$grid,$col);
  $unsort[]=$mo.$ro.'-'.$sx.'-'.$sy;
 }
}

$empty=[];
//clear unneeded tags
for ($y=0; $y<$yy; $y++) {
 for ($x=0; $x<$xx; $x++) {
  if (substr($grid[$x][$y],0,1)=='0'){
   $empty[]=$x.'x'.$y;
   $tmp=fdwall($x,$y,$xx,$yy,$grid);
    //out("alert('$tmp');");
   if ($y<$yy && stripos($tmp,'D')!==false){
    $t1=substr($grid[$x][$y+1],0,3);
    $t2=substr($grid[$x][$y+1],4);
    //out("//$x x $y : $t1 $t2".PHP_EOL);
    $grid[$x][$y+1]=$t1.'0'.$t2;
   }
   if ($y>0 && stripos($tmp,'U')!==false){
    $t1=substr($grid[$x][$y-1],0,5);
    $t2='';//substr($grid[$x][$y-1],4);
    //out("//$x x $y : $t1 $t2".PHP_EOL);
    $grid[$x][$y-1]=$t1.'0'.$t2;
   }
   if ($x>0 && stripos($tmp,'L')!==false){
    $t1=substr($grid[$x-1][$y],0,4);
    $t2=substr($grid[$x-1][$y],5);
    //out("//$x x $y : $t1 $t2".PHP_EOL);
    $grid[$x-1][$y]=$t1.'0'.$t2;
   }
   if ($x<$xx && stripos($tmp,'R')!==false){
    $t1=substr($grid[$x+1][$y],0,2);
    $t2=substr($grid[$x+1][$y],3);
    //out("//$x x $y : $t1 $t2".PHP_EOL);
    $grid[$x+1][$y]=$t1.'0'.$t2;
   }
  }
 }
}
//fix: if nothing to flip, make rotate
for ($y=0; $y<$yy; $y++) {
 for ($x=0; $x<$xx; $x++) {
  //echo substr($grid[$x][$y],1,1);
  if (substr($grid[$x][$y],1,1)=='2') {
   $uz=substr($grid[$x][$y],3,1);
   $dz=substr($grid[$x][$y],5,1);
   if ($dz==$uz) {
    //echo "// $x $y ".$grid[$x][$y]." > ";
    $grid[$x][$y]=substr($grid[$x][$y],0,1).'1'.substr($grid[$x][$y],2);
    //echo $grid[$x][$y].PHP_EOL;
   }
  }
  if (substr($grid[$x][$y],1,1)=='3') {
   $lz=substr($grid[$x][$y],2,1);
   $rz=substr($grid[$x][$y],4,1);
   if ($lz==$rz) {
    $grid[$x][$y]=substr($grid[$x][$y],0,1).'1'.substr($grid[$x][$y],2);
   }
  }
 }
}

// sort array first? move anywheres first then HV?
sort($unsort);

//shuffle objects
if (1==1){ //show unshuffled puzz
foreach ($unsort as $tmp) {
 $ta=explode('-',$tmp);

 //ROTATE
 if (substr($ta[0],1,1)=='1') {
  //echo 'console.log("'.$ta[0].' '.$ta[1].'x'.$ta[2].' '.$grid[$ta[1]][$ta[2]].'");'.PHP_EOL;
  for ($i=1;$i<mt_rand(1,4);$i++){
   $tt=$grid[$ta[1]][$ta[2]];
   //echo "console.log('$tt ";
   $grid[$ta[1]][$ta[2]]=substr($tt,0,1).substr($tt,1,1).substr($tt,3,1).substr($tt,4,1).substr($tt,5,1).substr($tt,2,1);
   //echo $grid[$ta[1]][$ta[2]]."');".PHP_EOL;
  }
 }
 if (substr($ta[0],1,1)=='2') {
 //flip UD
  for ($i=1;$i<mt_rand(1,2);$i++){
   $tt=$grid[$ta[1]][$ta[2]];
   //echo "console.log('$tt');".PHP_EOL;
   $grid[$ta[1]][$ta[2]]=substr($tt,0,1).substr($tt,1,1).substr($tt,2,1).substr($tt,5,1).substr($tt,4,1).substr($tt,3,1);
  }
 }
 if (substr($ta[0],1,1)=='3') {
 //flip LR
  for ($i=1;$i<mt_rand(1,2);$i++){
   $tt=$grid[$ta[1]][$ta[2]];
   //echo "console.log('$tt');".PHP_EOL;
   $grid[$ta[1]][$ta[2]]=substr($tt,0,1).substr($tt,1,1).substr($tt,4,1).substr($tt,3,1).substr($tt,2,1).substr($tt,5,1);
  }

 }

 //SCRAMBLE
 if (substr($ta[0],0,1)=='2') {
  //move anywhere free
  $rnd=mt_rand(0,count($empty)-1);
  $tb=explode('x',$empty[$rnd]);
  $grid[$tb[0]][$tb[1]]=$grid[$ta[1]][$ta[2]];
  $grid[$ta[1]][$ta[2]]=str_repeat('0',6);
  $empty[$rnd]=$ta[1].'x'.$ta[2];
 }
 if (substr($ta[0],0,1)=='3') {
  //move UD
  $tem=[];
  $nm=0;
  foreach ($empty as $e) {
   if (substr($e,0,1)==$ta[1]) {
    $tem[]=$e.'x'.$nm;
   }
   $nm++;
  }
  if (count($tem)) {
   $rnd=mt_rand(0,count($tem)-1);
   $tb=explode('x',$tem[$rnd]);
   $grid[$tb[0]][$tb[1]]=$grid[$ta[1]][$ta[2]];
   $grid[$ta[1]][$ta[2]]=str_repeat('0',6);
   $empty[$tb[2]]=$ta[1].'x'.$ta[2];
  }
 }
 if (substr($ta[0],0,1)=='4') {
  //move LR
  $tem=[];
  $nm=0;
  foreach ($empty as $e) {
//echo substr($e,2,1).' '.$ta[2].PHP_EOL;
   if (substr($e,2,1)==$ta[2]) {
    $tem[]=$e.'x'.$nm;
   }
   $nm++;
  }
  if (count($tem)) {
   $rnd=mt_rand(0,count($tem)-1);
   $tb=explode('x',$tem[$rnd]);
   $grid[$tb[0]][$tb[1]]=$grid[$ta[1]][$ta[2]];
   $grid[$ta[1]][$ta[2]]=str_repeat('0',6);
   $empty[$tb[2]]=$ta[1].'x'.$ta[2];
  }
 }
}
}


//output grid for JS or JSON
for ($y=0; $y<$yy; $y++) {
 for ($x=0; $x<$xx; $x++) {
  if ($file){
   $tmp=explode("=",$grid[$ii]);
   if ($x.'x'.$y==$tmp[0]) {
     $out.='"grid['.$x.']['.$y.']":"'.$tmp[1].'",';
   }
   $ii++;
  }else{
    $out.='"grid['.$x.']['.$y.']":"'.$grid[$x][$y].'",';
  }
 }
}
 $out.='"nul":"nul"}';


function gentag($px,$py,$xx,$yy,$grid,$col){
 //generate possible tags, check for wall/tags
 //if wall 0, empty rnd, tag copy
 $fp='';
 if ($px>0){//lf wall
  $c=substr($col,mt_rand(1,strlen($col)-1),1);
  $lf=$grid[$px-1][$py];
  $fp.= substr($lf,0,1)=='0' ? $c : substr($lf,4,1); 
 } else {
  $fp.='0';
 }
 if ($py>0){//up wall
  $c=substr($col,mt_rand(1,strlen($col)-1),1);
  $lf=$grid[$px][$py-1];
  $fp.= substr($lf,0,1)=='0' ? $c : substr($lf,5,1); 
 } else {
  $fp.='0';
 }
 if ($px<$xx-1){//rt wall
  $c=substr($col,mt_rand(1,strlen($col)-1),1);
  $lf=$grid[$px+1][$py];
  $fp.= substr($lf,0,1)=='0' ? $c : substr($lf,2,1); 
 } else {
  $fp.='0';
 }
 if ($py<$yy-1){//dn wall
  $c=substr($col,mt_rand(1,strlen($col)-1),1);
  $lf=$grid[$px][$py+1];
  $fp.= substr($lf,0,1)=='0' ? $c : substr($lf,3,1); 
 } else {
  $fp.='0';
 }
 return $fp; //4 tags: yv0r
}

function posmov($px,$py,$xx,$yy,$grid){
 //find possible moves, check for walls/circles
 $fp='';
 $tmp= $px>0 ? '1' : '0'; //lf
 $fp.= $tmp && substr($grid[$px-1][$py],0,1)=='0' ? 'L' : '';
 $tmp= $py>0 ? '1' : '0'; //up
 $fp.= $tmp && substr($grid[$px][$py-1],0,1)=='0' ? 'U' : '';
 $tmp= $px<$xx-1 ? '1' : '0'; //rt
 $fp.= $tmp && substr($grid[$px+1][$py],0,1)=='0' ? 'R' : '';
 $tmp= $py<$yy-1 ? '1' : '0'; //dn
 $fp.= $tmp && substr($grid[$px][$py+1],0,1)=='0' ? 'D' : '';
 return $fp; //lurd
}
function fdwall($px,$py,$xx,$yy,$grid){
 //find possible moves/walls
 $fp='';
 $fp.= $px>0 ? 'L' : ''; //lf
 $fp.= $py>0 ? 'U' : ''; //up
 $fp.= $px<$xx-1 ? 'R' : ''; //rt
 $fp.= $py<$yy-1 ? 'D' : ''; //dn
 return $fp; //lurd
}

//$out= str_replace("'", '"', $out);
if ($nxc==0){
 echo $out;
}
?>