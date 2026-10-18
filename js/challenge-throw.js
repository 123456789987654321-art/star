/* Cursor-directed throws: charge changes range; release commits the preview. */
(function(g){
  'use strict';
  class ChallengeThrow{
    constructor(game){this.game=game;this.charging=false;this.power=0;this.elapsed=0;this.pointerId=null;this.cursor=null;}
    get world(){return this.game.world;}
    enabled(){return this.world.phase==='aim'&&this.game.app.state==='play'&&!this.game.intro&&!this.world.result;}
    aim(e){
      const sc=this.game.app.scene,canvas=sc.canvas||sc.gl?.canvas,rect=canvas?.getBoundingClientRect?.();
      const width=rect?.width||g.innerWidth||sc.w,height=rect?.height||g.innerHeight||sc.h;
      const ray=sc._ray((e.clientX-(rect?.left||0))/width*2-1,1-(e.clientY-(rect?.top||0))/height*2);
      if(Math.abs(ray.d[2])<1e-8)return;
      const t=(.09-ray.o[2])/ray.d[2];if(t<0)return;
      this.cursor={x:ray.o[0]+ray.d[0]*t,y:ray.o[1]+ray.d[1]*t};
      this.preview();
    }
    preview(){if(this.cursor)this.world.action('throw-aim',{...this.cursor,power:this.power});}
    pointerDown(e){
      if(!this.enabled()||(e.button!==undefined&&e.button!==0))return false;
      if(this.charging){
        if(e.pointerId!==undefined&&e.pointerId!==this.pointerId){this.cancel();return false;}
        return true;
      }
      if(this.world.projectile||!this.world.ammo.length)return true;
      this.pointerId=e.pointerId;this.charging=true;this.elapsed=0;this.power=0;this.aim(e);return true;
    }
    pointerMove(e){
      if(!this.enabled())return false;
      // Secondary-button drag and multi-touch remain available to the camera.
      if(e.buttons&2)return false;
      if(this.charging&&e.pointerId!==undefined&&e.pointerId!==this.pointerId)return false;
      this.aim(e);return true;
    }
    pointerUp(e){
      if(e.button!==undefined&&e.button!==0)return false;
      if(!this.charging||e.pointerId!==undefined&&e.pointerId!==this.pointerId)return false;
      if(!this.enabled()){this.cancel();return true;}
      this.aim(e);this.charging=false;this.pointerId=null;
      this.world.action('shoot');return true;
    }
    frame(dt){
      if(!this.enabled()){if(this.charging)this.cancel();return;}
      if(!this.charging)return;
      this.elapsed=(this.elapsed+Math.max(0,Number(dt)||0))%8;
      this.power=1-Math.abs(this.elapsed/4-1);this.preview();
    }
    cancel(){
      const consumed=this.charging;this.charging=false;this.pointerId=null;this.elapsed=0;this.power=0;this.world.throwPower=0;
      if(this.enabled())this.preview();return consumed;
    }
  }
  g.ChallengeThrow=ChallengeThrow;
})(typeof window!=='undefined'?window:globalThis);
